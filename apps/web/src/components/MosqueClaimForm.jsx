import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";

export default function MosqueClaimForm({ mosqueId }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("mosque_id", mosqueId);
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/mosque-claims", { method: "POST", body });
      setSubmitted(true);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <details className="card p-3 mb-4">
    <summary className="fw-semibold text-mc">Manage this mosque? Apply for administrator access</summary>
    <div className="pt-3">
      {!user ? <Link to="/login" state={{ from: `/mosque/${mosqueId}` }}>Log in to submit your application</Link> : submitted ? <p role="status">Your application was submitted for review. <Link to="/profile" state={{ tab: "claims" }}>Track your application</Link>.</p> : <form onSubmit={submit}>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <div className="mb-3"><label htmlFor="claim-role" className="form-label">Your role at the mosque</label><input id="claim-role" name="role_at_mosque" className="form-control" required maxLength={255} /></div>
        <div className="mb-3"><label htmlFor="claim-reason" className="form-label">Reason for requesting access</label><textarea id="claim-reason" name="verification_reason" className="form-control" required maxLength={5000} /></div>
        <div className="mb-3"><label htmlFor="claim-document" className="form-label">Supporting document (PDF, JPG or PNG, up to 10 MB)</label><input id="claim-document" name="document" type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png" required /></div>
        <button className="btn btn-mc" disabled={busy}>{busy ? "Submitting..." : "Submit application"}</button>
      </form>}
    </div>
  </details>;
}
