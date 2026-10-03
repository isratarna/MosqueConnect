import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Flag } from "lucide-react";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";

// Mirrors ContentReport::CATEGORIES on the API.
const CATEGORIES = [
  ["inaccurate", "Inaccurate or outdated"],
  ["inappropriate", "Inappropriate content"],
  ["fraud", "Fraud or scam"],
  ["safety", "Safety concern"],
  ["spam", "Spam"],
  ["other", "Something else"],
];

/**
 * "Report" button for a content page. `type` is one of announcement, event, campaign,
 * mosque, review or lost_found; `id` is that item's id. Logged-out visitors are sent to log in first.
 */
export default function ReportButton({ type, id, className = "btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" }) {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("inaccurate");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  if (!user) {
    return (
      <Link to="/login" state={{ from: location.pathname + location.search }} className={className}>
        <Flag size={14} aria-hidden="true" /> Report
      </Link>
    );
  }

  const close = () => {
    if (busy) return;
    setOpen(false);
    setError("");
    if (sent) { setSent(""); setReason(""); setDetails(""); setCategory("inaccurate"); }
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest("/api/reports", {
        method: "POST",
        body: { reportable_type: type, reportable_id: Number(id), category, reason: reason.trim(), details: details.trim() || null },
      });
      setSent(response.message || "Your report has been submitted for review.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const fieldId = `report-${type}-${id}`;

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <Flag size={14} aria-hidden="true" /> Report
      </button>
      {open && (
        <Modal
          title="Report this content"
          onClose={close}
          busy={busy}
          footer={sent ? <button type="button" className="btn btn-mc" onClick={close}>Close</button> : (
            <>
              <button type="button" className="btn btn-outline-secondary" onClick={close} disabled={busy}>Cancel</button>
              <button type="submit" form={fieldId} className="btn btn-mc" disabled={busy || !reason.trim()}>{busy ? "Sending…" : "Submit report"}</button>
            </>
          )}
        >
          {sent ? <p className="mb-0" role="status">{sent}</p> : (
            <form id={fieldId} onSubmit={submit}>
              {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
              <div className="mb-3">
                <label className="form-label" htmlFor={`${fieldId}-category`}>What is wrong?</label>
                <select id={`${fieldId}-category`} className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                  {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor={`${fieldId}-reason`}>Short reason</label>
                <input id={`${fieldId}-reason`} className="form-control" value={reason} maxLength={255} required onChange={(event) => setReason(event.target.value)} />
              </div>
              <div>
                <label className="form-label" htmlFor={`${fieldId}-details`}>More details (optional)</label>
                <textarea id={`${fieldId}-details`} className="form-control" rows="3" maxLength={5000} value={details} onChange={(event) => setDetails(event.target.value)} />
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
