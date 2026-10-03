import { useId, useState } from "react";
import Modal from "./Modal";
import { useLocale } from "../hooks/useLocale";

/**
 * Confirms an action, optionally asking for a reason. Accessible and
 * validated, so a decision is never a mis-click on a browser popup.
 *
 * reason: undefined (no box) | "optional" | "required"
 * onConfirm(reason) may return a promise; the dialog stays open and shows the
 * error if it rejects.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = "primary",
  reason,
  reasonLabel,
  reasonPlaceholder = "",
  maxLength = 2000,
  onConfirm,
  onClose,
  children,
}) {
  const { t } = useLocale(); // [Urmee · i18n shared] default labels come from the locale files; callers can still pass their own
  const confirmText = confirmLabel ?? t("common.confirm");
  const reasonText = reasonLabel ?? t("common.reasonDefault");
  const reasonId = useId();
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const missing = reason === "required" && !text.trim();

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (missing || busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm(text.trim());
      onClose();
    } catch (requestError) {
      setError(requestError?.message || t("common.actionFailed"));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>{t("common.cancel")}</button>
          <button type="submit" form={`${reasonId}-form`} className={`btn btn-${tone}`} disabled={busy}>
            {busy ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />{t("common.working")}</> : confirmText}
          </button>
        </>
      )}
    >
      <form id={`${reasonId}-form`} onSubmit={submit} noValidate>
        {message && <p className="mb-3">{message}</p>}
        {children}
        {reason && (
          <div>
            <label className="form-label fw-semibold" htmlFor={reasonId}>
              {reasonText}{reason === "required" ? <span className="text-danger"> *</span> : <span className="text-muted fw-normal"> {t("common.optional")}</span>}
            </label>
            <textarea
              id={reasonId}
              className={`form-control ${touched && missing ? "is-invalid" : ""}`}
              rows="3"
              maxLength={maxLength}
              value={text}
              placeholder={reasonPlaceholder}
              aria-invalid={touched && missing}
              aria-describedby={`${reasonId}-help`}
              required={reason === "required"}
              onChange={(event) => setText(event.target.value)}
              onBlur={() => setTouched(true)}
            />
            <div id={`${reasonId}-help`} className={touched && missing ? "invalid-feedback d-block" : "form-text"}>
              {touched && missing ? t("common.reasonRequired", { label: reasonText }) : `${text.length}/${maxLength}`}
            </div>
          </div>
        )}
        {error && <div className="alert alert-danger small mt-3 mb-0" role="alert">{error}</div>}
      </form>
    </Modal>
  );
}
