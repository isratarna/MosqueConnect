import { useEffect, useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import { fetchPublicSettings } from "../utils/settingsApi";
import { dismissKey } from "../utils/adminConsole";

/** The super admin's maintenance notice, shown on every page until dismissed for this notice. */
export default function MaintenanceBanner() {
  const [notice, setNotice] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPublicSettings()
      .then((settings) => {
        if (!active) return;
        const text = (settings.maintenance_notice || "").trim();
        setNotice(text);
        try {
          setDismissed(Boolean(text) && sessionStorage.getItem(dismissKey(text)) === "1");
        } catch {
          setDismissed(false);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!notice || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(dismissKey(notice), "1"); } catch { /* private mode */ }
  };

  return (
    <div className="mc-maintenance-banner border-bottom" role="status" aria-live="polite">
      <div className="container d-flex align-items-start gap-2 py-2 small">
        <TriangleAlert size={18} className="flex-shrink-0 mt-1" aria-hidden="true" />
        <p className="mb-0 flex-grow-1" style={{ whiteSpace: "pre-line" }}>{notice}</p>
        <button type="button" className="btn btn-sm btn-link text-reset p-0 flex-shrink-0" onClick={dismiss} aria-label="Dismiss notice">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
