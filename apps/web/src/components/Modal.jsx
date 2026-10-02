import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * A Bootstrap-styled dialog rendered into <body>. The page shell has a CSS
 * transform, which would otherwise pin a fixed dialog to the page instead of
 * the screen. Escape and the backdrop close it; focus moves into it on open
 * and back to the opener on close.
 */
export default function Modal({ title, onClose, children, footer, size = "", busy = false }) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    const first = dialogRef.current?.querySelector("input, select, textarea, button:not(.btn-close-modal)");
    (first || dialogRef.current)?.focus();
    const onKey = (event) => {
      if (event.key !== "Escape" || busy) return;
      // With dialogs stacked, Escape closes only the top one.
      const open = document.querySelectorAll(".modal[aria-modal='true']");
      if (open[open.length - 1] !== dialogRef.current?.closest(".modal")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.({ preventScroll: true });
    };
    // Focus once on open; busy changes must not move focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`} ref={dialogRef} tabIndex={-1}>
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header">
              <h2 className="modal-title h5 fw-bold" id={titleId}>{title}</h2>
              <button type="button" className="btn btn-sm btn-light btn-close-modal" aria-label="Close" onClick={onClose} disabled={busy}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
