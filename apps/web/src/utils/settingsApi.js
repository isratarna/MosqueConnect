import { apiUrl } from "../config";

let settingsRequest = null;

/** Public site settings (maintenance notice, claims/reports switches, Eid season). Cached per page load. */
export function fetchPublicSettings({ refresh = false } = {}) {
  if (!settingsRequest || refresh) {
    settingsRequest = fetch(apiUrl("/api/settings/public"), { headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Site settings could not be loaded.");
        return payload.data || {};
      })
      .catch((error) => {
        settingsRequest = null;
        throw error;
      });
  }
  return settingsRequest;
}
