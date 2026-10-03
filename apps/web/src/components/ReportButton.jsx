import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Flag } from "lucide-react";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";
import { useLocale } from "../hooks/useLocale";

// Mirrors ContentReport::CATEGORIES on the API.
// [Urmee · F1 Part 5] Mirrors ContentReport::CATEGORIES on the API (POST /api/reports).
// [Urmee · i18n shared] The labels are report.categories.<code> in the locale files.
const CATEGORIES = ["inaccurate", "inappropriate", "fraud", "safety", "spam", "other"];

/**
 * "Report" button for a content page. `type` is one of announcement, event, campaign,
 * mosque, review or lost_found; `id` is that item's id. Logged-out visitors are sent to log in first.
 */
// [Urmee · F3 Part 1] New optional `label` ("Report incorrect info" on the profile) and a link-style
// className.
export default function ReportButton({ type, id, label, className = "btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" }) {
  const { t } = useLocale();
  const buttonLabel = label ?? t("report.button");
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("inaccurate");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  // [Urmee · F1 Part 5] Reporting needs an account; logged-out visitors go to Login and come back.
  if (!user) {
    return (
      <Link to="/login" state={{ from: location.pathname + location.search }} className={className}>
        <Flag size={14} aria-hidden="true" /> {buttonLabel}
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
      setSent(response.message || t("report.submitted"));
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
        <Flag size={14} aria-hidden="true" /> {buttonLabel}
      </button>
      {open && (
        <Modal
          title={t("report.title")}
          onClose={close}
          busy={busy}
          footer={sent ? <button type="button" className="btn btn-mc" onClick={close}>{t("common.close")}</button> : (
            <>
              <button type="button" className="btn btn-outline-secondary" onClick={close} disabled={busy}>{t("common.cancel")}</button>
              <button type="submit" form={fieldId} className="btn btn-mc" disabled={busy || !reason.trim()}>{busy ? t("report.sending") : t("report.submit")}</button>
            </>
          )}
        >
          {sent ? <p className="mb-0" role="status">{sent}</p> : (
            <form id={fieldId} onSubmit={submit}>
              {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
              <div className="mb-3">
                <label className="form-label" htmlFor={`${fieldId}-category`}>{t("report.whatWrong")}</label>
                <select id={`${fieldId}-category`} className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                  {CATEGORIES.map((value) => <option key={value} value={value}>{t(`report.categories.${value}`)}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor={`${fieldId}-reason`}>{t("report.shortReason")}</label>
                <input id={`${fieldId}-reason`} className="form-control" value={reason} maxLength={255} required onChange={(event) => setReason(event.target.value)} />
              </div>
              <div>
                <label className="form-label" htmlFor={`${fieldId}-details`}>{t("report.details")}</label>
                <textarea id={`${fieldId}-details`} className="form-control" rows="3" maxLength={5000} value={details} onChange={(event) => setDetails(event.target.value)} />
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
