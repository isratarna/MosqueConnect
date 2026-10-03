import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function SupportModal({ title, description, onClose, children }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = originalOverflow;
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const keepFocusInDialog = (event) => {
    if (event.key !== "Tab") return;

    const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)];
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="mc-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={dialogRef}
        className="mc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
        aria-describedby="support-modal-description"
        onKeyDown={keepFocusInDialog}
      >
        <header className="mc-modal__header">
          <div>
            <p className="mc-kicker mb-2">Support the community</p>
            <h2 id="support-modal-title">{title}</h2>
            <p id="support-modal-description">{description}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="mc-modal__close"
            onClick={onClose}
            aria-label="Close support form"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
