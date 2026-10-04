import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Check, PencilLine, X } from "lucide-react";
import { describeValue } from "../../utils/suggestionFormat";
import { BlockStack, SkeletonRegion } from "../skeletons";
import { useLocale } from "../../hooks/useLocale";

// [Urmee · i18n suggestions] The label is a translation key (suggest.review.<key>), resolved when rendered.
const STATUSES = [
  { value: "pending", labelKey: "waiting" },
  { value: "accepted", labelKey: "accepted" },
  { value: "rejected", labelKey: "rejected" },
  { value: "all", labelKey: "all" },
];

const dateLabel = (value, locale) => (value ? new Date(value).toLocaleDateString(locale === "en-BD" ? "en-GB" : locale, { day: "numeric", month: "short", year: "numeric" }) : "");

/** "Trusted contributor" badge for people with enough accepted corrections. */
export function TrustedBadge({ className = "" }) {
  const { t } = useLocale();
  return (
    <span className={`badge mc-trusted-badge ${className}`} title={t("suggest.review.trustedTitle")}>
      <BadgeCheck size={13} aria-hidden="true" /> {t("suggest.review.trusted")}
    </span>
  );
}

/**
 * A review queue for suggested corrections with a before → after view.
 *
 * `load(params, { signal })` returns a page ({ data, current_page, last_page, total });
 * `review(suggestion, "accept" | "reject", note)` decides one.
 */
export default function SuggestionReviewList({ load, review, showMosque = false, filters = null, filterKey = "", onReviewed, emptyText }) {
  const { t, locale } = useLocale(); // [Urmee · i18n suggestions] the default empty text and every label come from the locale files
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reload = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => { setPage(1); }, [status, filterKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    load({ status, page }, { signal: controller.signal })
      .then(setResult)
      .catch((err) => { if (err.name !== "AbortError") setLoadError(err.message); });
    return () => controller.abort();
    // `load` changes with the parent's filters, which filterKey tracks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page, revision, filterKey]);

  const decide = async (suggestion, action) => {
    setBusy(`${suggestion.id}-${action}`);
    setError("");
    setMessage("");
    try {
      const response = await review(suggestion, action, notes[suggestion.id] || "");
      setMessage(response?.message || (action === "accept" ? t("suggest.review.acceptedMsg") : t("suggest.review.rejectedMsg")));
      onReviewed?.();
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const items = result?.data || [];

  return (
    <div className="mc-suggestions">
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <label className="visually-hidden" htmlFor="suggestion-status">{t("suggest.review.show")}</label>
        <select id="suggestion-status" className="form-select form-select-sm" style={{ width: 190 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((item) => <option key={item.value} value={item.value}>{t(`suggest.review.${item.labelKey}`)}</option>)}
        </select>
        {filters}
        {result && <span className="small text-muted ms-auto">{t("suggest.review.count", { count: result.total })}</span>}
      </div>

      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      {message && <div className="alert alert-success py-2" role="status">{message}</div>}

      {loadError ? (
        <div className="alert alert-danger" role="alert">{loadError} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={reload}>{t("common.retry")}</button></div>
      ) : !result ? (
        <SkeletonRegion label={t("suggest.review.loading")}><BlockStack heights={[90, 90]} /></SkeletonRegion>
      ) : items.length === 0 ? (
        <p className="text-muted py-3 mb-0">{status === "pending" ? (emptyText ?? t("suggest.review.empty")) : t("suggest.review.nothing")}</p>
      ) : (
        <ul className="list-unstyled d-grid gap-3 mb-0">
          {items.map((suggestion) => {
            const before = suggestion.status === "pending" ? (suggestion.current ?? suggestion.before) : suggestion.before;
            return (
              <li key={suggestion.id} className="mc-suggestion border rounded-3 p-3">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <span className="badge bg-light text-dark border"><PencilLine size={13} aria-hidden="true" /> {t(`suggest.fields.${suggestion.field}`, { defaultValue: suggestion.field_label })}</span>
                  {showMosque && suggestion.mosque && <Link to={`/mosque/${suggestion.mosque.id}`} className="fw-semibold text-mc text-decoration-none">{suggestion.mosque.name}</Link>}
                  {suggestion.status !== "pending" && <span className={`badge ${suggestion.status === "accepted" ? "bg-success" : "bg-secondary"}`}>{suggestion.auto_accepted ? t("suggest.review.acceptedAuto") : suggestion.status === "accepted" ? t("suggest.review.accepted") : t("suggest.review.rejected")}</span>}
                  <span className="small text-muted ms-auto">{dateLabel(suggestion.created_at, locale)}</span>
                </div>
                <div className="small mb-2">
                  {t("suggest.review.suggestedBy")} <strong>{suggestion.user?.name || t("suggest.review.visitor")}</strong>
                  {suggestion.user?.trusted_contributor && <TrustedBadge className="ms-1" />}
                  {suggestion.user && <span className="text-muted"> · {t("suggest.review.acceptedBefore", { count: suggestion.user.accepted_suggestions_count })}</span>}
                </div>

                {suggestion.field === "other" ? null : (
                  <div className="mc-suggestion__diff" aria-label={t("suggest.review.beforeAfter")}>
                    <div className="mc-suggestion__before">
                      <span className="mc-suggestion__label">{suggestion.status === "pending" ? t("suggest.review.now") : t("suggest.review.before")}</span>
                      <span>{describeValue(suggestion.field, before, t, locale)}</span>
                    </div>
                    <ArrowRight size={18} className="mc-suggestion__arrow" aria-hidden="true" />
                    <div className="mc-suggestion__after">
                      <span className="mc-suggestion__label">{t("suggest.review.suggested")}</span>
                      <span>{describeValue(suggestion.field, { ...(before || {}), ...suggestion.payload, source: undefined }, t, locale)}</span>
                    </div>
                  </div>
                )}
                {suggestion.field === "location" && suggestion.payload && (
                  <a className="small text-mc d-inline-block mt-1" href={`https://www.google.com/maps/search/?api=1&query=${suggestion.payload.latitude},${suggestion.payload.longitude}`} target="_blank" rel="noopener noreferrer">{t("suggest.review.seeOnMap")}</a>
                )}
                {suggestion.note && <blockquote className="mc-suggestion__note">“{suggestion.note}”</blockquote>}

                {suggestion.status === "pending" ? (
                  suggestion.can_review ? (
                    <div className="d-flex flex-wrap gap-2 align-items-end mt-2">
                      <div className="flex-grow-1" style={{ minWidth: 200 }}>
                        <label className="form-label small mb-1" htmlFor={`review-note-${suggestion.id}`}>{t("suggest.review.noteToPerson")}</label>
                        <input id={`review-note-${suggestion.id}`} className="form-control form-control-sm" maxLength={1000} value={notes[suggestion.id] || ""} onChange={(e) => setNotes((current) => ({ ...current, [suggestion.id]: e.target.value }))} />
                      </div>
                      <button type="button" className="btn btn-sm btn-success" disabled={Boolean(busy)} onClick={() => decide(suggestion, "accept")}>
                        <Check size={14} aria-hidden="true" /> {suggestion.field === "other" ? t("suggest.review.markDone") : t("suggest.review.acceptApply")}
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" disabled={Boolean(busy)} onClick={() => decide(suggestion, "reject")}>
                        <X size={14} aria-hidden="true" /> {t("suggest.review.reject")}
                      </button>
                    </div>
                  ) : (
                    <p className="small text-muted mb-0 mt-2">{suggestion.field === "prayer_time" || suggestion.field === "jumuah" ? t("suggest.review.needRolePrayer") : t("suggest.review.needRoleManager")}</p>
                  )
                ) : (
                  <p className="small text-muted mb-0 mt-2">
                    {suggestion.reviewer ? t("suggest.review.reviewedBy", { name: suggestion.reviewer.name }) : t("suggest.review.reviewed")} {dateLabel(suggestion.reviewed_at, locale)}
                    {suggestion.review_note && <> · “{suggestion.review_note}”</>}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {result && result.last_page > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3 small">
          <span className="text-muted">{t("suggest.review.page", { current: result.current_page, last: result.last_page })}</span>
          <div className="btn-group btn-group-sm">
            <button type="button" className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>{t("suggest.review.previous")}</button>
            <button type="button" className="btn btn-outline-secondary" disabled={page >= result.last_page} onClick={() => setPage((n) => n + 1)}>{t("suggest.review.next")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
