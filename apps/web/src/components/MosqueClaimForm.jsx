import { useState } from "react";
import { Link } from "react-router-dom";
import { Trans } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../hooks/useLocale";
import { apiRequest } from "../utils/api";

export default function MosqueClaimForm({ mosqueId }) {
  const { t } = useLocale();
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
    <summary className="fw-semibold text-mc">{t("claim.summary")}</summary>
    <div className="pt-3">
      {!user ? <Link to="/login" state={{ from: `/mosque/${mosqueId}` }}>{t("claim.login")}</Link> : submitted ? <p role="status"><Trans i18nKey="claim.submitted" components={{ track: <Link to="/profile" state={{ tab: "claims" }} /> }} /></p> : <form onSubmit={submit}>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <div className="mb-3"><label htmlFor="claim-role" className="form-label">{t("claim.role")}</label><input id="claim-role" name="role_at_mosque" className="form-control" required maxLength={255} /></div>
        <div className="mb-3"><label htmlFor="claim-reason" className="form-label">{t("claim.reason")}</label><textarea id="claim-reason" name="verification_reason" className="form-control" required maxLength={5000} /></div>
        <div className="mb-3"><label htmlFor="claim-document" className="form-label">{t("claim.document")}</label><input id="claim-document" name="document" type="file" className="form-control" accept=".pdf,.jpg,.jpeg,.png" required aria-describedby="claim-document-privacy" /><div id="claim-document-privacy" className="form-text">{t("claim.privacy")}</div></div>
        <button className="btn btn-mc" disabled={busy}>{busy ? t("claim.submitting") : t("claim.submit")}</button>
      </form>}
    </div>
  </details>;
}
