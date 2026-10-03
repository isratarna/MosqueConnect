import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, MessageSquareText, PackageOpen, Search, Send, X } from "lucide-react";
import {
  COMPLAINT_STATUS, GOODS_STATUS, LOST_FOUND_STATUS,
  fetchMosqueComplaints, fetchMosqueGoodsDonations, fetchMosqueLostFound, hubLabelT, respondToComplaint,
  updateGoodsDonation, updateLostFoundStatus,
} from "../../utils/communityHubApi";
import { formatShortDate } from "../../utils/dashboardFormat";
import { BlockStack, SkeletonRegion } from "../skeletons";
import { useLocale } from "../../hooks/useLocale";

/** Loads one admin list and reloads it when the filter or `revision` changes. */
function useAdminList(load, mosqueId, status) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    load(mosqueId, status, { signal: controller.signal })
      .then((data) => setItems(data.data || []))
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load, mosqueId, status, revision]);

  const replace = (item) => setItems((current) => current.map((existing) => (existing.id === item.id ? item : existing)));
  return { items, loading, error, replace, reload: () => setRevision((n) => n + 1) };
}

function ListState({ loading, error, empty, onRetry, children }) {
  const { t } = useLocale(); // [Urmee · i18n community] text from the locale files
  if (loading) return <SkeletonRegion label={t("hubAdmin.loading")}><BlockStack heights={[72, 72]} /></SkeletonRegion>;
  if (error) return <div className="alert alert-danger" role="alert">{error} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={onRetry}>{t("common.retry")}</button></div>;
  if (empty) return <div className="text-center text-muted py-4"><Search size={26} aria-hidden="true" /><p className="mb-0 mt-2">{empty}</p></div>;
  return children;
}

function StatusFilter({ id, value, onChange, options }) {
  const { t } = useLocale();
  return (
    <div className="mb-3" style={{ maxWidth: 260 }}>
      <label className="visually-hidden" htmlFor={id}>{t("hubAdmin.filterStatus")}</label>
      <select id={id} className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
      </select>
    </div>
  );
}

// ---- Feedback inbox ----------------------------------------------------------

export function ComplaintsInbox({ mosqueId }) {
  const { t } = useLocale();
  const [status, setStatus] = useState("active");
  const list = useAdminList(fetchMosqueComplaints, mosqueId, status);

  return (
    <>
      <h2 className="h5 fw-bold mb-1"><MessageSquareText size={19} className="text-mc me-2" aria-hidden="true" />{t("hubAdmin.feedbackTitle")}</h2>
      <p className="text-muted small">{t("hubAdmin.feedbackIntro")}</p>
      <StatusFilter id="complaint-status" value={status} onChange={setStatus} options={[["active", t("hubAdmin.needsAction")], ["", t("hubAdmin.all")], ...Object.keys(COMPLAINT_STATUS).map((key) => [key, hubLabelT(t, "complaintStatus", key)])]} />
      <ListState {...list} onRetry={list.reload} empty={!list.items.length && t("hubAdmin.noFeedback")}>
        {list.items.map((complaint) => <ComplaintItem key={complaint.id} mosqueId={mosqueId} complaint={complaint} onSaved={list.replace} />)}
      </ListState>
    </>
  );
}

function ComplaintItem({ mosqueId, complaint, onSaved }) {
  const { t, locale } = useLocale();
  const [status, setStatus] = useState(complaint.status === "open" ? "in_progress" : complaint.status);
  const [reply, setReply] = useState(complaint.admin_response || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const statusClass = (COMPLAINT_STATUS[complaint.status] || [])[1] || "bg-secondary";

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const data = await respondToComplaint(mosqueId, complaint.id, { status, admin_response: reply.trim() || null });
      onSaved(data.data);
      setSaved(true);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <article className="border rounded p-3 mb-3">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
        <strong className="me-auto">{complaint.subject}</strong>
        <span className="badge bg-light text-dark border">{hubLabelT(t, "complaintCategory", complaint.category)}</span>
        <span className={`badge ${statusClass}`}>{hubLabelT(t, "complaintStatus", complaint.status)}</span>
      </div>
      <p className="small text-muted mb-2">{complaint.is_anonymous ? t("hubAdmin.anonymous") : complaint.author?.name || t("hubAdmin.visitor")} · {formatShortDate(complaint.created_at, locale)}</p>
      <p className="mb-3" style={{ whiteSpace: "pre-line" }}>{complaint.body}</p>
      <form onSubmit={save}>
        <label className="form-label small fw-semibold" htmlFor={`reply-${complaint.id}`}>{t("hubAdmin.yourReply")}</label>
        <textarea id={`reply-${complaint.id}`} className="form-control form-control-sm mb-2" rows={2} maxLength={5000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("hubAdmin.replyPlaceholder")} />
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <label className="visually-hidden" htmlFor={`status-${complaint.id}`}>{t("hubAdmin.status")}</label>
          <select id={`status-${complaint.id}`} className="form-select form-select-sm w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.keys(COMPLAINT_STATUS).map((key) => <option key={key} value={key}>{hubLabelT(t, "complaintStatus", key)}</option>)}
          </select>
          <button type="submit" className="btn btn-sm btn-mc" disabled={busy}><Send size={14} aria-hidden="true" /> {busy ? t("hubAdmin.saving") : t("hubAdmin.save")}</button>
          {saved && <span className="small text-success" role="status">{complaint.responded_at ? t("hubAdmin.savedNotified") : t("hubAdmin.savedOnly")}</span>}
        </div>
        {complaint.responded_at && <p className="form-text mb-0">{t("hubAdmin.lastReplied", { date: formatShortDate(complaint.responded_at, locale) })}</p>}
        {error && <div className="alert alert-danger py-2 small mt-2 mb-0" role="alert">{error}</div>}
      </form>
    </article>
  );
}

// ---- Lost & found at the mosque ----------------------------------------------

export function LostFoundManager({ mosqueId }) {
  const { t } = useLocale();
  const [status, setStatus] = useState("open");
  const list = useAdminList(fetchMosqueLostFound, mosqueId, status);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function mark(item, next) {
    setBusy(item.id);
    setError("");
    try {
      const data = await updateLostFoundStatus(item.id, next);
      list.replace(data.data);
    } catch (err) { setError(err.message); }
    finally { setBusy(null); }
  }

  return (
    <>
      <h2 className="h5 fw-bold mb-1"><PackageOpen size={19} className="text-mc me-2" aria-hidden="true" />{t("hubAdmin.lostFoundTitle")}</h2>
      <p className="text-muted small">{t("hubAdmin.lostFoundIntro")}</p>
      <StatusFilter id="lost-found-status" value={status} onChange={setStatus} options={[["", t("hubAdmin.all")], ...Object.keys(LOST_FOUND_STATUS).map((key) => [key, hubLabelT(t, "lostFoundStatus", key)])]} />
      {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
      <ListState {...list} onRetry={list.reload} empty={!list.items.length && t("hubAdmin.noItems")}>
        <ul className="list-unstyled mc-dash-list">
          {list.items.map((item) => (
            <li key={item.id}>
              <div className="min-w-0">
                <div className="fw-semibold text-truncate">
                  <span className={`badge ${item.type === "lost" ? "bg-danger" : "bg-success"} me-1`}>{hubLabelT(t, "type", item.type)}</span>
                  <Link to={`/community/lost-found/${item.id}`}>{item.title}</Link>
                </div>
                <div className="small text-muted text-truncate">{hubLabelT(t, "lostFoundCategory", item.category)} · {item.occurred_on}{item.poster ? ` · ${item.poster.name}` : ""} · {hubLabelT(t, "lostFoundStatus", item.status)}</div>
              </div>
              {item.status === "open"
                ? <button type="button" className="btn btn-sm btn-outline-success flex-shrink-0" disabled={busy !== null} onClick={() => mark(item, "returned")}><Check size={14} aria-hidden="true" /> {t("hubAdmin.returned")}</button>
                : <button type="button" className="btn btn-sm btn-outline-secondary flex-shrink-0" disabled={busy !== null} onClick={() => mark(item, "open")}>{t("hubAdmin.reopen")}</button>}
            </li>
          ))}
        </ul>
      </ListState>
    </>
  );
}

// ---- Goods donation pledges ----------------------------------------------------

export function GoodsDonationManager({ mosqueId }) {
  const { t } = useLocale();
  const [status, setStatus] = useState("pending");
  const list = useAdminList(fetchMosqueGoodsDonations, mosqueId, status);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function update(donation, next) {
    setBusy(donation.id);
    setError("");
    try {
      const data = await updateGoodsDonation(mosqueId, donation.id, next);
      list.replace(data.data);
    } catch (err) { setError(err.message); }
    finally { setBusy(null); }
  }

  return (
    <>
      <h2 className="h5 fw-bold mb-1"><PackageOpen size={19} className="text-mc me-2" aria-hidden="true" />{t("hubAdmin.goodsTitle")}</h2>
      <p className="text-muted small">{t("hubAdmin.goodsIntro")}</p>
      <StatusFilter id="goods-status" value={status} onChange={setStatus} options={[["", t("hubAdmin.all")], ...Object.keys(GOODS_STATUS).map((key) => [key, hubLabelT(t, "goodsStatus", key)])]} />
      {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
      <ListState {...list} onRetry={list.reload} empty={!list.items.length && t("hubAdmin.noPledges")}>
        {list.items.map((donation) => (
          <article key={donation.id} className="border rounded p-3 mb-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <strong className="me-auto">{donation.quantity} × {donation.item_name}</strong>
              <span className={`badge ${GOODS_STATUS[donation.status]?.[1] || "bg-secondary"}`}>{hubLabelT(t, "goodsStatus", donation.status)}</span>
            </div>
            <p className="small text-muted mb-2">
              {donation.donor?.name || t("hubAdmin.donor")} · {donation.contact} · {hubLabelT(t, "goodsCondition", donation.condition)} · {hubLabelT(t, "deliveryShort", donation.delivery_method)}
              {donation.preferred_date && ` · ${t("hubAdmin.preferred", { date: donation.preferred_date })}`}
            </p>
            {donation.notes && <p className="small mb-2">“{donation.notes}”</p>}
            {(donation.status === "pending" || donation.status === "accepted") && (
              <div className="d-flex flex-wrap gap-1">
                {donation.status === "pending" && <button type="button" className="btn btn-sm btn-success" disabled={busy !== null} onClick={() => update(donation, "accepted")}><Check size={14} aria-hidden="true" /> {t("hubAdmin.accept")}</button>}
                <button type="button" className="btn btn-sm btn-outline-success" disabled={busy !== null} onClick={() => update(donation, "received")}>{t("hubAdmin.markReceived")}</button>
                <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy !== null} onClick={() => update(donation, "declined")}><X size={14} aria-hidden="true" /> {t("hubAdmin.decline")}</button>
              </div>
            )}
          </article>
        ))}
      </ListState>
    </>
  );
}
