import { useEffect, useState } from "react";
import { Bot, Check, Download, FileText, TriangleAlert, X } from "lucide-react";
import Modal from "../Modal";
import ConfirmDialog from "../ConfirmDialog";
import { aiReview, previewKind } from "../../utils/adminConsole";
import { downloadClaimDocument, fetchClaim, fetchClaimDocumentBlob, reviewClaim } from "../../utils/systemAdminApi";
import { BlockStack, Skeleton, SkeletonRegion } from "../skeletons";
import { useLocale } from "../../hooks/useLocale";
import { statusLabel } from "../../utils/labels";

// [Urmee · i18n super-admin] Dates follow the active language.
const dateTime = (value, locale) => value ? new Intl.DateTimeFormat(locale === "en-BD" ? "en-GB" : locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const labelize = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

// [Urmee · i18n super-admin] Dialog texts are built from t() so they follow the language (reuses the keys of the claims list).
const actionConfig = (t) => ({
  approve: { title: t("claimReview.approve.title"), message: t("claimReview.approve.message"), confirmLabel: t("superAdmin.more.claimApprove.confirm"), tone: "success", reason: "optional", reasonLabel: t("superAdmin.more.claimApprove.reason") },
  reject: { title: t("superAdmin.more.claimReject.title"), message: t("claimReview.reject.message"), confirmLabel: t("superAdmin.more.claimReject.confirm"), tone: "danger", reason: "required", reasonLabel: t("superAdmin.more.claimReject.reason") },
  "request-information": { title: t("superAdmin.more.claimInfo.title"), message: t("superAdmin.more.claimInfo.message"), confirmLabel: t("superAdmin.more.claimInfo.confirm"), tone: "primary", reason: "required", reasonLabel: t("superAdmin.more.claimInfo.reason") },
});

/** One claim, reviewed in place: proof, automated advice, competing claims and the decision. */
export default function ClaimReviewPanel({ claimId, onClose, onChanged }) {
  const { t, locale } = useLocale();
  const ACTIONS = actionConfig(t);
  const [detail, setDetail] = useState(null);
  const [competing, setCompeting] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [doc, setDoc] = useState(null);
  const [docError, setDocError] = useState("");
  const [action, setAction] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    fetchClaim(claimId, { signal: controller.signal })
      .then((payload) => { setDetail(payload.data); setCompeting(payload.competing_claims || []); })
      .catch((error) => { if (error.name !== "AbortError") setLoadError(error.message); });
    return () => controller.abort();
  }, [claimId, revision]);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = null;
    setDoc(null);
    setDocError("");
    fetchClaimDocumentBlob(claimId, { signal: controller.signal })
      .then((loaded) => { objectUrl = loaded.url; setDoc(loaded); })
      .catch((error) => { if (error.name !== "AbortError") setDocError(error.message); });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [claimId]);

  const finalized = ["approved", "rejected"].includes(detail?.status);
  const review = aiReview(detail);
  const kind = doc ? previewKind(doc.mimeType) : null;

  return (
    <>
      <Modal title={detail ? t("claimReview.modalTitle", { id: detail.id, mosque: detail.mosque?.name || t("claimReview.mosqueFallback") }) : t("claimReview.modalTitleDefault")} onClose={onClose} size="modal-xl">
        {loadError && <div className="alert alert-danger">{loadError}</div>}
        {!detail && !loadError && <SkeletonRegion label={t("claimReview.loading")}><BlockStack heights={[32, 260]} /></SkeletonRegion>}
        {detail && (
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className="h6 fw-bold mb-0 d-flex align-items-center gap-2"><FileText size={16} aria-hidden="true" />{t("claimReview.proof")}</h3>
                <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={() => downloadClaimDocument(detail.id).catch((error) => setDocError(error.message))}>
                  <Download size={14} aria-hidden="true" />{t("claimReview.download")}
                </button>
              </div>
              {docError && <div className="alert alert-warning small">{docError}</div>}
              {!doc && !docError && <SkeletonRegion label={t("claimReview.loadingDoc")} delay={0}><div className="mc-doc-viewer"><Skeleton height="100%" radius="8px" /></div></SkeletonRegion>}
              {doc && kind === "pdf" && <iframe className="mc-doc-viewer" src={doc.url} title={t("claimReview.proofFor", { id: detail.id })} />}
              {doc && kind === "image" && <img className="mc-doc-viewer-image" src={doc.url} alt={t("claimReview.proofFor", { id: detail.id })} />}
              {doc && !kind && <div className="alert alert-secondary small">{t("claimReview.noPreview")}</div>}
            </div>

            <div className="col-lg-5">
              <section className="mb-4">
                <h3 className="h6 fw-bold">{t("claimReview.applicant")}</h3>
                <div><strong>{detail.user?.name}</strong> <span className="text-muted small">· {detail.user?.phone}</span></div>
                <div className="small"><span className="text-muted">{t("claimReview.statedRole")}</span> {detail.role_at_mosque || "—"}</div>
                {detail.verification_reason && <p className="small mb-1"><span className="text-muted">{t("claimReview.reason")}</span> {detail.verification_reason}</p>}
                <div className="small text-muted">{t("claimReview.submitted", { date: dateTime(detail.submitted_at, locale) })} <strong>{statusLabel(t, detail.status)}</strong></div>
                {detail.review_note && <div className="small mt-1"><span className="text-muted">{t("claimReview.lastNote")}</span> {detail.review_note}</div>}
                <div className="small text-muted mt-1">{detail.mosque?.address}</div>
              </section>

              <section className="mb-4 border rounded p-3 bg-light-subtle" aria-labelledby={`ai-${detail.id}`}>
                <h3 id={`ai-${detail.id}`} className="h6 fw-bold d-flex align-items-center gap-2 mb-2"><Bot size={16} aria-hidden="true" />{t("claimReview.ai")} <span className="badge bg-secondary-subtle text-secondary-emphasis fw-normal">{t("claimReview.adviceOnly")}</span></h3>
                {review.state === "none" && <p className="small text-muted mb-0">{t("claimReview.notChecked")}</p>}
                {review.state === "error" && <p className="small text-muted mb-0">{t("claimReview.checkFailed", { message: review.message })}</p>}
                {review.state === "done" && (
                  <>
                    {review.badge && <div className="mb-2"><span className={`badge bg-${review.badge.tone}`}>{review.badge.percent}% · {review.badge.label}</span> <span className="small text-muted">{t("claimReview.looksLike", { type: labelize(review.documentType) })}</span></div>}
                    <p className="small mb-2">{review.summary}</p>
                    <div className="small mb-2">
                      <span className={review.mentionsMosque ? "text-success" : "text-danger"}>{review.mentionsMosque ? "✓" : "✗"} {t("claimReview.mosqueName")}</span>
                      <span className="mx-2 text-muted">·</span>
                      <span className={review.mentionsApplicant ? "text-success" : "text-danger"}>{review.mentionsApplicant ? "✓" : "✗"} {t("claimReview.applicantName")}</span>
                    </div>
                    {review.redFlags.length > 0 && (
                      <ul className="small text-danger ps-3 mb-2">{review.redFlags.map((flag) => <li key={flag}><TriangleAlert size={12} className="me-1" aria-hidden="true" />{flag}</li>)}</ul>
                    )}
                    {review.findings.length > 0 && <ul className="small text-muted ps-3 mb-0">{review.findings.map((finding) => <li key={finding}>{finding}</li>)}</ul>}
                  </>
                )}
              </section>

              <section className="mb-4">
                <h3 className="h6 fw-bold">{t("claimReview.others")}</h3>
                {competing.length === 0 ? <p className="small text-muted mb-0">{t("claimReview.none")}</p> : (
                  <ul className="list-unstyled small mb-0">
                    {competing.map((other) => (
                      <li key={other.id} className="border-bottom py-1 d-flex justify-content-between gap-2">
                        <span><strong>{other.user?.name}</strong> · {other.role_at_mosque || "—"}</span>
                        <span className="text-muted text-nowrap">{statusLabel(t, other.status)}{other.ai_score != null && ` · ${Math.round(other.ai_score * 100)}%`}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {(detail.applicant_claims || []).length > 1 && (
                <section className="mb-4">
                  <h3 className="h6 fw-bold">{t("claimReview.applicantOthers")}</h3>
                  <ul className="list-unstyled small mb-0">
                    {detail.applicant_claims.filter((other) => other.id !== detail.id).map((other) => (
                      <li key={other.id} className="d-flex justify-content-between"><span>{other.mosque?.name}</span><span className="text-muted">{statusLabel(t, other.status)}</span></li>
                    ))}
                  </ul>
                </section>
              )}

              {!finalized && (
                <div className="d-flex flex-wrap gap-2 border-top pt-3">
                  <button type="button" className="btn btn-success d-flex align-items-center gap-1" onClick={() => setAction("approve")}><Check size={16} aria-hidden="true" />{t("claimReview.approveBtn")}</button>
                  <button type="button" className="btn btn-outline-danger d-flex align-items-center gap-1" onClick={() => setAction("reject")}><X size={16} aria-hidden="true" />{t("claimReview.rejectBtn")}</button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setAction("request-information")}>{t("claimReview.moreInfo")}</button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {action && (
        <ConfirmDialog
          {...ACTIONS[action]}
          onClose={() => setAction(null)}
          onConfirm={async (note) => {
            await reviewClaim(detail.id, action, note);
            setRevision((value) => value + 1);
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
