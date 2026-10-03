import { FACILITY_META } from "../data/mosques.js";
import { formatClockTime } from "./prayerTime.js";

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
 * [Urmee · i18n suggestions] Pass `t` and the Intl locale to get the line in the active language; without them it is
 * the English text (which the unit tests check).
 */
export function describeValue(field, value, t = null, locale) {
  const time = (clock) => (t ? formatClockTime(clock, locale) : to12Hour(clock));
  const notSet = t ? t("suggest.describe.notSet") : "Not set";
  const prayerName = (key) => (t ? t(`prayer.${key}`, { defaultValue: prayerLabel(key) }) : prayerLabel(key));
  if (!value) return notSet;
  switch (field) {
    case "prayer_time": {
      if (!value.jamaat_time) return t ? t("suggest.describe.prayerNotSet", { prayer: prayerName(value.prayer) }) : `${prayerLabel(value.prayer)}: not set`;
      const adhan = value.adhan_time ? (t ? t("suggest.describe.adhan", { time: time(value.adhan_time) }) : ` (adhan ${to12Hour(value.adhan_time)})`) : "";
      const estimated = value.source === "calculated" ? (t ? t("suggest.describe.estimated") : " · estimated") : "";
      return t
        ? t("suggest.describe.prayerJamaat", { prayer: prayerName(value.prayer), time: time(value.jamaat_time), adhan, estimated })
        : `${prayerLabel(value.prayer)} jamaat ${to12Hour(value.jamaat_time)}${adhan}${estimated}`;
    }
    case "jumuah": {
      const label = value.label || (t ? t("suggest.describe.jumuahLabel", { number: value.sequence || 1 }) : `Jumuah ${value.sequence || 1}`);
      if (!value.jamaat_time) return t ? t("suggest.describe.jumuahNotSet", { label }) : `${label}: not set`;
      const khutbah = value.khutbah_time ? (t ? t("suggest.describe.khutbah", { time: time(value.khutbah_time) }) : `, khutbah ${to12Hour(value.khutbah_time)}`) : "";
      return t ? t("suggest.describe.jumuahJamaat", { label, time: time(value.jamaat_time), khutbah }) : `${label} jamaat ${to12Hour(value.jamaat_time)}${khutbah}`;
    }
    case "phone":
      return value.phone || notSet;
    case "address":
      return [value.address, value.area, value.district].filter(Boolean).join(", ") || notSet;
    case "location":
      return Number.isFinite(Number(value.latitude)) && value.latitude !== null
        ? `${Number(value.latitude).toFixed(5)}, ${Number(value.longitude).toFixed(5)}`
        : notSet;
    case "facilities":
      return Array.isArray(value.facilities) && value.facilities.length
        ? value.facilities.map((key) => (t ? t(`facility.${key}`, { defaultValue: FACILITY_META[key]?.label || key }) : FACILITY_META[key]?.label || key)).join(", ")
        : (t ? t("suggest.describe.noneListed") : "None listed");
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
// [Urmee · i18n suggestions] Optional `t` and `locale` give the sentence in the active language.
export function communityConfirmedLabel(value, now = new Date(), t = null, locale) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days <= 0) return t ? t("suggest.community.today") : "Times confirmed by the community today";
  if (days === 1) return t ? t("suggest.community.yesterday") : "Times confirmed by the community yesterday";
  if (days < 30) return t ? t("suggest.community.daysAgo", { count: days }) : `Times confirmed by the community ${days} days ago`;
  const when = date.toLocaleDateString(t ? locale : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  return t ? t("suggest.community.onDate", { date: when }) : `Times confirmed by the community on ${when}`;
}
