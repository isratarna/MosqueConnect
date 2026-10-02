import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Modal from "../Modal";
import { useAuth } from "../../context/AuthContext";
import { COMPLAINT_CATEGORIES, sendComplaint } from "../../utils/communityHubApi";

/** "Send feedback to this mosque": private feedback only the mosque's admins and the super admin read. */
export default function ComplaintForm({ mosque, onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await sendComplaint(mosque.id, {
        category: form.get("category"),
        subject: form.get("subject").trim(),
        body: form.get("body").trim(),
        is_anonymous: anonymous,
      });
      setSent(true);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={`Send feedback to ${mosque.name}`} onClose={onClose} busy={busy}>
      {!user ? (
        <div className="text-center py-2">
          <p>Please sign in to send feedback, so the mosque can reply to you.</p>
          <Link className="btn btn-mc" to="/login" state={{ from: location.pathname }}>Sign in</Link>
        </div>
      ) : sent ? (
        <div className="text-center py-2" role="status">
          <CheckCircle2 size={40} className="text-success mb-2" aria-hidden="true" />
          <p className="fw-semibold mb-1">Thank you, your feedback was sent.</p>
          <p className="small text-muted">You'll be notified when the mosque replies. You can follow it under <Link to="/profile?tab=feedback">Profile → My feedback</Link>.</p>
          <button type="button" className="btn btn-outline-mc" onClick={onClose}>Close</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p className="small text-muted"><ShieldCheck size={15} className="text-mc me-1" aria-hidden="true" />Feedback is private. Only this mosque's admins and the MosqueConnect super admin can read it, never the public.</p>
          <div className="mb-3">
            <label className="form-label" htmlFor="complaint-category">Topic</label>
            <select id="complaint-category" name="category" className="form-select" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {COMPLAINT_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="complaint-subject">Subject</label>
            <input id="complaint-subject" name="subject" className="form-control" required maxLength={255} />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="complaint-body">Your feedback</label>
            <textarea id="complaint-body" name="body" className="form-control" rows={4} required minLength={10} maxLength={5000} />
          </div>
          <div className="form-check mb-1">
            <input id="complaint-anonymous" type="checkbox" className="form-check-input" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            <label className="form-check-label" htmlFor="complaint-anonymous">Send anonymously</label>
          </div>
          <p className="form-text mb-3" id="complaint-anonymous-help">
            {anonymous
              ? "The mosque admin won't see your name. The MosqueConnect super admin can still see who sent it, to stop abuse. You'll still get the mosque's reply."
              : "The mosque admin will see your name."}
          </p>
          {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn btn-mc" disabled={busy}>{busy ? "Sending…" : "Send feedback"}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
