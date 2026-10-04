import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Modal from "../Modal";
import { useAuth } from "../../context/AuthContext";
import { COMPLAINT_CATEGORIES, hubLabelT, sendComplaint } from "../../utils/communityHubApi";
import { useLocale } from "../../hooks/useLocale";

/** "Send feedback to this mosque": private feedback only the mosque's admins and the super admin read. */
export default function ComplaintForm({ mosque, onClose }) {
  const { t } = useLocale(); // [Urmee · i18n community] text from the locale files
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
    <Modal title={t("complaintForm.title", { mosque: mosque.name })} onClose={onClose} busy={busy}>
      {!user ? (
        <div className="text-center py-2">
          <p>{t("complaintForm.signIn")}</p>
          <Link className="btn btn-mc" to="/login" state={{ from: location.pathname }}>{t("complaintForm.signInButton")}</Link>
        </div>
      ) : sent ? (
        <div className="text-center py-2" role="status">
          <CheckCircle2 size={40} className="text-success mb-2" aria-hidden="true" />
          <p className="fw-semibold mb-1">{t("complaintForm.thanks")}</p>
          <p className="small text-muted">{t("complaintForm.followUp")} <Link to="/profile?tab=feedback">{t("complaintForm.followLink")}</Link>.</p>
          <button type="button" className="btn btn-outline-mc" onClick={onClose}>{t("complaintForm.close")}</button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p className="small text-muted"><ShieldCheck size={15} className="text-mc me-1" aria-hidden="true" />{t("complaintForm.privacy")}</p>
          <div className="mb-3">
            <label className="form-label" htmlFor="complaint-category">{t("complaintForm.topic")}</label>
            <select id="complaint-category" name="category" className="form-select" required defaultValue="">
              <option value="" disabled>{t("complaintForm.choose")}</option>
              {COMPLAINT_CATEGORIES.map(([value]) => <option key={value} value={value}>{hubLabelT(t, "complaintCategory", value)}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="complaint-subject">{t("complaintForm.subject")}</label>
            <input id="complaint-subject" name="subject" className="form-control" required maxLength={255} />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="complaint-body">{t("complaintForm.body")}</label>
            <textarea id="complaint-body" name="body" className="form-control" rows={4} required minLength={10} maxLength={5000} />
          </div>
          <div className="form-check mb-1">
            <input id="complaint-anonymous" type="checkbox" className="form-check-input" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            <label className="form-check-label" htmlFor="complaint-anonymous">{t("complaintForm.anonymous")}</label>
          </div>
          <p className="form-text mb-3" id="complaint-anonymous-help">
            {anonymous ? t("complaintForm.anonymousOn") : t("complaintForm.anonymousOff")}
          </p>
          {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
            <button type="submit" className="btn btn-mc" disabled={busy}>{busy ? t("complaintForm.sending") : t("complaintForm.send")}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
