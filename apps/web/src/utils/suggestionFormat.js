import { FACILITY_META } from "../data/mosques.js";

/** What a visitor can suggest a correction to. */
export const SUGGESTION_FIELDS = [
  { value: "prayer_time", label: "A prayer time" },
  { value: "jumuah", label: "Jumuah time" },
  { value: "phone", label: "Phone number" },
  { value: "address", label: "Address" },
  { value: "location", label: "Map location" },
  { value: "facilities", label: "Facilities" },
  { value: "other", label: "Something else" },
];

export const PRAYERS = [
  { value: "fajr", label: "Fajr" },
  { value: "dhuhr", label: "Dhuhr" },
  { value: "asr", label: "Asr" },
  { value: "maghrib", label: "Maghrib" },
  { value: "isha", label: "Isha" },
];

/** "20:15" → "8:15 PM". Deterministic, unlike toLocaleTimeString. */
export function to12Hour(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
  if (!match) return "";
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${match[2]} ${suffix}`;
}

const prayerLabel = (value) => PRAYERS.find((prayer) => prayer.value === value)?.label || value;

/**
 * One line describing a value of the given field, for the before → after view.
 * Returns "Not set" for an empty value.
 */
export function describeValue(field, value) {
  if (!value) return "Not set";
  switch (field) {
    case "prayer_time": {
      if (!value.jamaat_time) return `${prayerLabel(value.prayer)}: not set`;
      const adhan = value.adhan_time ? ` (adhan ${to12Hour(value.adhan_time)})` : "";
      const estimated = value.source === "calculated" ? " · estimated" : "";
      return `${prayerLabel(value.prayer)} jamaat ${to12Hour(value.jamaat_time)}${adhan}${estimated}`;
    }
    case "jumuah": {
      if (!value.jamaat_time) return `${value.label || `Jumuah ${value.sequence || 1}`}: not set`;
      const khutbah = value.khutbah_time ? `, khutbah ${to12Hour(value.khutbah_time)}` : "";
      return `${value.label || `Jumuah ${value.sequence || 1}`} jamaat ${to12Hour(value.jamaat_time)}${khutbah}`;
    }
    case "phone":
      return value.phone || "Not set";
    case "address":
      return [value.address, value.area, value.district].filter(Boolean).join(", ") || "Not set";
    case "location":
      return Number.isFinite(Number(value.latitude)) && value.latitude !== null
        ? `${Number(value.latitude).toFixed(5)}, ${Number(value.longitude).toFixed(5)}`
        : "Not set";
    case "facilities":
      return Array.isArray(value.facilities) && value.facilities.length
        ? value.facilities.map((key) => FACILITY_META[key]?.label || key).join(", ")
        : "None listed";
    default:
      return "—";
  }
}

const hhmm = (value) => (value ? String(value).slice(0, 5) : "");

/**
 * The form's starting values for a field, taken from the public mosque
 * profile, so the visitor only changes what is wrong.
 */
export function initialPayload(field, mosque, { prayer = "fajr", sequence = 1 } = {}) {
  switch (field) {
    case "prayer_time": {
      const entry = (mosque?.prayer_schedule || []).find((item) => item.prayer === prayer || item.label?.toLowerCase() === prayer);
      return { prayer, jamaat_time: hhmm(entry?.jamaat_time), adhan_time: hhmm(entry?.adhan_time) };
    }
    case "jumuah": {
      const session = (mosque?.jumuah_sessions || []).find((item) => Number(item.sequence) === Number(sequence)) || (mosque?.jumuah_sessions || [])[0];
      return { sequence: Number(session?.sequence || sequence), jamaat_time: hhmm(session?.jamaat_time), khutbah_time: hhmm(session?.khutbah_time) };
    }
    case "phone":
      return { phone: mosque?.phone || "" };
    case "address":
      return { address: mosque?.address && mosque.address !== "Address unavailable" ? mosque.address : "", district: mosque?.district || "", area: mosque?.area || "" };
    case "location":
      return { latitude: mosque?.lat ?? mosque?.latitude ?? "", longitude: mosque?.lng ?? mosque?.longitude ?? "" };
    case "facilities":
      return { facilities: Array.isArray(mosque?.facilities) ? [...mosque.facilities] : [] };
    default:
      return {};
  }
}

/** Drop empty optional values before sending a suggestion. */
export function cleanPayload(field, payload) {
  const result = {};
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === "" || value === null || value === undefined) return;
    result[key] = value;
  });
  if (field === "location") {
    result.latitude = Number(result.latitude);
    result.longitude = Number(result.longitude);
  }
  if (field === "facilities") result.facilities = payload.facilities || [];
  return result;
}

/** "Times confirmed by the community 2 days ago". */
export function communityConfirmedLabel(value, now = new Date()) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days <= 0) return "Times confirmed by the community today";
  if (days === 1) return "Times confirmed by the community yesterday";
  if (days < 30) return `Times confirmed by the community ${days} days ago`;
  return `Times confirmed by the community on ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}
