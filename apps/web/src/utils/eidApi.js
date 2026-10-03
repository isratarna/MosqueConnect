import { apiUrl } from "../config";
import { apiRequest } from "./api";
import { buildEidJamaatIcs, eidJamaatShareText } from "./eidCalendar";
import { formatClockTime } from "./prayerTime";

export const EID_OPTIONS = [
  { value: "fitr", label: "Eid-ul-Fitr" },
  { value: "adha", label: "Eid-ul-Adha" },
];

export function eidLabel(eid) {
  return EID_OPTIONS.find((option) => option.value === eid)?.label || "Eid";
}

// [Urmee · i18n dashboard] The same names in the active language (eid.fitr / eid.adha); the API's own label is the fallback.
export const eidNameT = (t, eid, fallback) => (EID_OPTIONS.some((option) => option.value === eid) ? t(`eid.${eid}`) : fallback || t("eid.generic"));

let seasonRequest = null;

/** The configured Eid season, or null. Shared by the banner, the Eid page and the profile. */
export function fetchEidSeason({ refresh = false } = {}) {
  if (!seasonRequest || refresh) {
    seasonRequest = fetch(apiUrl("/api/eid-season"), { headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Eid information could not be loaded.");
        return payload.data || null;
      })
      .catch((error) => {
        seasonRequest = null;
        throw error;
      });
  }
  return seasonRequest;
}

export async function fetchNearbyEidJamaats({ lat, lng, radius, women = false, signal } = {}) {
  const query = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radius) });
  if (women) query.set("women", "1");

  const response = await fetch(apiUrl(`/api/eid-jamaats/nearby?${query}`), {
    headers: { Accept: "application/json" },
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Nearby Eid jamaats could not be loaded.");
  return { jamaats: Array.isArray(payload.data) ? payload.data : [], season: payload.season || null };
}

const adminBase = (mosqueId) => `/api/admin/mosques/${encodeURIComponent(mosqueId)}/eid-jamaats`;

export function fetchAdminEidJamaats(mosqueId, { signal } = {}) {
  return apiRequest(adminBase(mosqueId), { signal });
}

export function saveEidJamaat(mosqueId, jamaat, id = null) {
  return apiRequest(id ? `${adminBase(mosqueId)}/${id}` : adminBase(mosqueId), {
    method: id ? "PATCH" : "POST",
    body: jamaat,
  });
}

export function deleteEidJamaat(mosqueId, id) {
  return apiRequest(`${adminBase(mosqueId)}/${id}`, { method: "DELETE" });
}

export function publishEidJamaats(mosqueId, eid, year) {
  return apiRequest(`${adminBase(mosqueId)}/publish`, { method: "POST", body: { eid, year } });
}

/** Saves a jamaat as an .ics file the visitor can open in any calendar app. */
export function downloadEidJamaatIcs(jamaat) {
  const ics = buildEidJamaatIcs(jamaat);
  if (!ics) return;
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `eid-jamaat-${jamaat.id}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Shares a jamaat with the native share sheet, or copies it when there is none.
 * Resolves to "shared", "copied" or "cancelled".
 */
export async function shareEidJamaat(jamaat) {
  const text = eidJamaatShareText(jamaat, formatClockTime);
  const url = `${window.location.origin}/mosque/${jamaat.mosque_id}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: "Eid jamaat", text, url });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }

  await navigator.clipboard.writeText(`${text}\n${url}`);
  return "copied";
}
