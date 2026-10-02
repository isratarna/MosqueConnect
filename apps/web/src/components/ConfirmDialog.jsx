import { useId, useState } from "react";
import Modal from "./Modal";

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
  confirmLabel = "Confirm",
  tone = "primary",
  reason,
  reasonLabel = "Reason",
  reasonPlaceholder = "",
  maxLength = 2000,
  onConfirm,
  onClose,
  children,
}) {
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
      setError(requestError?.message || "The action could not be completed.");
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
          <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form={`${reasonId}-form`} className={`btn btn-${tone}`} disabled={busy}>
            {busy ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Working…</> : confirmLabel}
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
              {reasonLabel}{reason === "required" ? <span className="text-danger"> *</span> : <span className="text-muted fw-normal"> (optional)</span>}
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
              {touched && missing ? `${reasonLabel} is required.` : `${text.length}/${maxLength}`}
            </div>
          </div>
        )}
        {error && <div className="alert alert-danger small mt-3 mb-0" role="alert">{error}</div>}
      </form>
    </Modal>
  );
}
