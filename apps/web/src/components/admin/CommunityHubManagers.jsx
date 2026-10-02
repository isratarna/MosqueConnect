import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, MessageSquareText, PackageOpen, Search, Send, X } from "lucide-react";
import {
  COMPLAINT_CATEGORIES, COMPLAINT_STATUS, GOODS_STATUS, LOST_FOUND_CATEGORIES, LOST_FOUND_STATUS,
  fetchMosqueComplaints, fetchMosqueGoodsDonations, fetchMosqueLostFound, labelOf, respondToComplaint,
  updateGoodsDonation, updateLostFoundStatus,
} from "../../utils/communityHubApi";
import { formatShortDate } from "../../utils/dashboardFormat";

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
  if (loading) return <p role="status" className="text-muted">Loading…</p>;
  if (error) return <div className="alert alert-danger" role="alert">{error} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={onRetry}>Retry</button></div>;
  if (empty) return <div className="text-center text-muted py-4"><Search size={26} aria-hidden="true" /><p className="mb-0 mt-2">{empty}</p></div>;
  return children;
}

function StatusFilter({ id, value, onChange, options }) {
  return (
    <div className="mb-3" style={{ maxWidth: 260 }}>
      <label className="visually-hidden" htmlFor={id}>Filter by status</label>
      <select id={id} className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
      </select>
    </div>
  );
}

// ---- Feedback inbox ----------------------------------------------------------

export function ComplaintsInbox({ mosqueId }) {
  const [status, setStatus] = useState("active");
  const list = useAdminList(fetchMosqueComplaints, mosqueId, status);

  return (
    <>
      <h2 className="h5 fw-bold mb-1"><MessageSquareText size={19} className="text-mc me-2" aria-hidden="true" />Feedback inbox</h2>
      <p className="text-muted small">Private feedback from visitors. Only your mosque's owners and managers and the super admin can read it. Names are hidden when the sender chose to stay anonymous. Your reply is sent to the sender.</p>
      <StatusFilter id="complaint-status" value={status} onChange={setStatus} options={[["active", "Needs action"], ["", "All"], ...Object.entries(COMPLAINT_STATUS).map(([key, [label]]) => [key, label])]} />
      <ListState {...list} onRetry={list.reload} empty={!list.items.length && "No feedback here."}>
        {list.items.map((complaint) => <ComplaintItem key={complaint.id} mosqueId={mosqueId} complaint={complaint} onSaved={list.replace} />)}
      </ListState>
    </>
  );
}

function ComplaintItem({ mosqueId, complaint, onSaved }) {
  const [status, setStatus] = useState(complaint.status === "open" ? "in_progress" : complaint.status);
  const [reply, setReply] = useState(complaint.admin_response || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [statusLabel, statusClass] = COMPLAINT_STATUS[complaint.status] || [complaint.status, "bg-secondary"];

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
        <span className="badge bg-light text-dark border">{labelOf(COMPLAINT_CATEGORIES, complaint.category)}</span>
        <span className={`badge ${statusClass}`}>{statusLabel}</span>
      </div>
      <p className="small text-muted mb-2">{complaint.is_anonymous ? "Anonymous" : complaint.author?.name || "A visitor"} · {formatShortDate(complaint.created_at)}</p>
      <p className="mb-3" style={{ whiteSpace: "pre-line" }}>{complaint.body}</p>
      <form onSubmit={save}>
        <label className="form-label small fw-semibold" htmlFor={`reply-${complaint.id}`}>Your reply</label>
        <textarea id={`reply-${complaint.id}`} className="form-control form-control-sm mb-2" rows={2} maxLength={5000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thank the sender and say what you will do" />
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <label className="visually-hidden" htmlFor={`status-${complaint.id}`}>Status</label>
          <select id={`status-${complaint.id}`} className="form-select form-select-sm w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(COMPLAINT_STATUS).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <button type="submit" className="btn btn-sm btn-mc" disabled={busy}><Send size={14} aria-hidden="true" /> {busy ? "Saving…" : "Save"}</button>
          {saved && <span className="small text-success" role="status">Saved{complaint.responded_at ? " · the sender was notified" : ""}</span>}
        </div>
        {complaint.responded_at && <p className="form-text mb-0">Last replied {formatShortDate(complaint.responded_at)}</p>}
        {error && <div className="alert alert-danger py-2 small mt-2 mb-0" role="alert">{error}</div>}
      </form>
    </article>
  );
}

// ---- Lost & found at the mosque ----------------------------------------------

export function LostFoundManager({ mosqueId }) {
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
      <h2 className="h5 fw-bold mb-1"><PackageOpen size={19} className="text-mc me-2" aria-hidden="true" />Lost &amp; found at your mosque</h2>
      <p className="text-muted small">Items visitors reported at your mosque. Mark one returned when its owner collects it. Open items close on their own after 30 days.</p>
      <StatusFilter id="lost-found-status" value={status} onChange={setStatus} options={[["", "All"], ...Object.entries(LOST_FOUND_STATUS).map(([key, [label]]) => [key, label])]} />
      {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
      <ListState {...list} onRetry={list.reload} empty={!list.items.length && "No items reported at your mosque."}>
        <ul className="list-unstyled mc-dash-list">
          {list.items.map((item) => (
            <li key={item.id}>
              <div className="min-w-0">
                <div className="fw-semibold text-truncate">
                  <span className={`badge ${item.type === "lost" ? "bg-danger" : "bg-success"} text-uppercase me-1`}>{item.type}</span>
                  <Link to={`/community/lost-found/${item.id}`}>{item.title}</Link>
                </div>
                <div className="small text-muted text-truncate">{labelOf(LOST_FOUND_CATEGORIES, item.category)} · {item.occurred_on}{item.poster ? ` · ${item.poster.name}` : ""} · {LOST_FOUND_STATUS[item.status]?.[0]}</div>
              </div>
              {item.status === "open"
                ? <button type="button" className="btn btn-sm btn-outline-success flex-shrink-0" disabled={busy !== null} onClick={() => mark(item, "returned")}><Check size={14} aria-hidden="true" /> Returned</button>
                : <button type="button" className="btn btn-sm btn-outline-secondary flex-shrink-0" disabled={busy !== null} onClick={() => mark(item, "open")}>Reopen</button>}
            </li>
          ))}
        </ul>
      </ListState>
    </>
  );
}

// ---- Goods donation pledges ----------------------------------------------------

const CONDITION_LABELS = { new: "New", gently_used: "Gently used", used: "Used" };
const DELIVERY_LABELS = { drop_off: "Donor will deliver", pickup: "Needs pickup", discuss: "Wants to discuss" };

export function GoodsDonationManager({ mosqueId }) {
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
      <h2 className="h5 fw-bold mb-1"><PackageOpen size={19} className="text-mc me-2" aria-hidden="true" />Goods donations</h2>
      <p className="text-muted small">Pledges of items such as food, clothes or prayer mats. The donor is told each time you accept, receive or decline a pledge.</p>
      <StatusFilter id="goods-status" value={status} onChange={setStatus} options={[["", "All"], ...Object.entries(GOODS_STATUS).map(([key, [label]]) => [key, label])]} />
      {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
      <ListState {...list} onRetry={list.reload} empty={!list.items.length && "No pledges here."}>
        {list.items.map((donation) => (
          <article key={donation.id} className="border rounded p-3 mb-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <strong className="me-auto">{donation.quantity} × {donation.item_name}</strong>
              <span className={`badge ${GOODS_STATUS[donation.status]?.[1] || "bg-secondary"}`}>{GOODS_STATUS[donation.status]?.[0] || donation.status}</span>
            </div>
            <p className="small text-muted mb-2">
              {donation.donor?.name || "A donor"} · {donation.contact} · {CONDITION_LABELS[donation.condition]} · {DELIVERY_LABELS[donation.delivery_method]}
              {donation.preferred_date && ` · preferred ${donation.preferred_date}`}
            </p>
            {donation.notes && <p className="small mb-2">“{donation.notes}”</p>}
            {(donation.status === "pending" || donation.status === "accepted") && (
              <div className="d-flex flex-wrap gap-1">
                {donation.status === "pending" && <button type="button" className="btn btn-sm btn-success" disabled={busy !== null} onClick={() => update(donation, "accepted")}><Check size={14} aria-hidden="true" /> Accept</button>}
                <button type="button" className="btn btn-sm btn-outline-success" disabled={busy !== null} onClick={() => update(donation, "received")}>Mark received</button>
                <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy !== null} onClick={() => update(donation, "declined")}><X size={14} aria-hidden="true" /> Decline</button>
              </div>
            )}
          </article>
        ))}
      </ListState>
    </>
  );
}
