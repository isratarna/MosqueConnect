import { apiUrl } from "../config";

const VIEWED_KEY = "mc:viewed-mosques";

/**
 * Count one anonymous profile view, directions tap or call tap. Uses
 * navigator.sendBeacon so the request survives the page navigating away
 * (Directions opens Google Maps, Call opens the dialer). The body is
 * form-encoded, which a beacon may send cross-origin without a preflight.
 */
export function trackMosqueEvent(mosqueId, event) {
  if (!mosqueId) return;
  const url = apiUrl(`/api/mosques/${mosqueId}/track`);
  const body = new URLSearchParams({ event });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon?.(url, body)) return;
    fetch(url, { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // Tracking must never break the page.
  }
}

/** Count a profile view once per mosque per browser session. */
export function trackMosqueView(mosqueId) {
  const id = String(mosqueId);
  let viewed = [];
  try {
    viewed = JSON.parse(sessionStorage.getItem(VIEWED_KEY) || "[]");
    if (viewed.includes(id)) return;
    sessionStorage.setItem(VIEWED_KEY, JSON.stringify([...viewed, id]));
  } catch {
    // Without session storage, still count the view.
  }
  trackMosqueEvent(id, "view");
}
