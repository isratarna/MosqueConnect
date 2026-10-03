import { useState } from "react";
import Modal from "../Modal";
import { apiRequest } from "../../utils/api";
import { useLocale } from "../../hooks/useLocale";

/**
 * [Urmee · F6 Part 1] "I can donate" dialog with an optional message ("Available after 5 pm").
 * The old button sent an empty body, so donors couldn't say when they were free.
 * POST /api/blood-requests/{id}/responses accepts { message }.
 */
export default function RespondDialog({ request, onDone, onClose }) {
  const { t } = useLocale(); // [Urmee · i18n pages]
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await apiRequest(`/api/blood-requests/${request.id}/responses`, { method: "POST", body: { message: message.trim() || null } });
      onDone(data);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t("respond.title", { group: request.blood_group })}
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
          <button type="submit" form="respond-form" className="btn btn-mc" disabled={busy}>{busy ? t("respond.sending") : t("respond.send")}</button>
        </>
      )}
    >
      <form id="respond-form" onSubmit={submit}>
        <p className="small text-muted">{t("respond.notice")}</p>
        {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
        <label className="form-label" htmlFor="respond-message">{t("respond.message")}</label>
        <textarea id="respond-message" className="form-control" rows="3" maxLength={500} placeholder={t("respond.placeholder")} value={message} onChange={(event) => setMessage(event.target.value)} />
      </form>
    </Modal>
  );
}
