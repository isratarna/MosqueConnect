/*
 * Journey planner ar "next jamat you can catch" er pure formatter ar constant
 * (node --test e chalano jay, kono API import nei).
 */
import { timeOptions } from "./intl.js";

export const JOURNEY_TIMEZONE = "Asia/Dhaka";

// Map marker ar timeline-e prottek namaz-er alada rong.
export const PRAYER_COLORS = {
  fajr: "#3b6fd8",
  dhuhr: "#d9a441",
  asr: "#e0752d",
  maghrib: "#b8406b",
  isha: "#5b3fa6",
};

export const FACILITY_OPTIONS = [
  { key: "women_area", label: "Women's area" },
  { key: "wudu", label: "Wudu" },
  { key: "parking", label: "Parking" },
];

// Map/autocomplete na thakleo demo kora jay emon kichu shohor.
// [Urmee · i18n journey] `key` names the city's translation (journey.cities.<key>); `label` stays the English default.
export const PRESET_PLACES = [
  { key: "dhaka", label: "Dhaka (Gulistan)", lat: 23.723, lng: 90.412 },
  { key: "chattogram", label: "Chattogram (GEC)", lat: 22.3593, lng: 91.8214 },
  { key: "comilla", label: "Comilla (Kandirpar)", lat: 23.4607, lng: 91.1809 },
  { key: "feni", label: "Feni", lat: 23.0159, lng: 91.3976 },
  { key: "sylhet", label: "Sylhet", lat: 24.8949, lng: 91.8687 },
  { key: "mymensingh", label: "Mymensingh", lat: 24.7471, lng: 90.4203 },
  { key: "rajshahi", label: "Rajshahi", lat: 24.3745, lng: 88.6042 },
  { key: "coxsbazar", label: "Cox's Bazar", lat: 21.4272, lng: 92.0058 },
];

// "14 min" ba "1h 20m".
export function formatMinutes(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  if (value < 60) return `${value} min`;
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

// [Urmee · i18n journey] Translated counterparts of formatMinutes / formatTime for the screens (the originals stay as they are for tests).
// "14m" / "1h 20m" in the active language (reuses prayer.remaining* from the locale files).
export function formatMinutesT(t, minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  return value < 60 ? t("prayer.remainingMinutes", { minutes: value }) : t("prayer.remainingHoursMinutes", { hours: Math.floor(value / 60), minutes: value % 60 });
}

// Clock time in Dhaka time, in the active language ("৪:৫০ ভোর" in Bangla).
export function formatTimeT(iso, locale = "en-BD") {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { ...timeOptions(locale), timeZone: JOURNEY_TIMEZONE }).format(date);
}

// Prayer name in the active language; unknown labels (Jumuah sessions...) keep what the API sent.
export const prayerNameT = (t, label, code) => t(`prayer.${String(code || label || "").toLowerCase()}`, { defaultValue: label });

export function formatTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: JOURNEY_TIMEZONE });
}

export function minutesUntil(iso, now = new Date()) {
  return (new Date(iso).getTime() - now.getTime()) / 60000;
}

// Prottek "ok" namaz-er jonno user je option bechhe niyeche (na hole prothom ta).
export function selectedStops(prayers = [], selection = {}) {
  return prayers
    .filter((prayer) => prayer.status === "ok" && prayer.options?.length)
    .map((prayer) => {
      const key = prayerKey(prayer);
      const option = prayer.options.find((o) => o.mosque.id === selection[key]) || prayer.options[0];
      return { ...option, prayer: prayer.prayer, key };
    });
}

// Ek trip-e eki namaz duibar (jemon raat-er trip-e Isha) aste pare, tai shuru-r somoy o key-te.
export function prayerKey(prayer) {
  return `${prayer.prayer}@${prayer.window?.starts_at}`;
}

// Google Maps directions link, bechhe newa stop gula waypoint hishebe (route order e).
export function buildMapsUrl({ origin, destination, stops = [], mode = "drive", maxWaypoints = 4 }) {
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: mode === "walk" ? "walking" : "driving",
  });

  const seen = new Set();
  const waypoints = [...stops]
    .sort((a, b) => (a.along_route_m ?? 0) - (b.along_route_m ?? 0))
    .filter((stop) => (seen.has(stop.mosque.id) ? false : seen.add(stop.mosque.id)))
    .slice(0, maxWaypoints)
    .map((stop) => `${stop.mosque.lat},${stop.mosque.lng}`);

  if (waypoints.length) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Live mode alert: porer stop-er 20 ar 5 min age.
export const ALERT_MINUTES = [20, 5];

export function dueAlerts(stops, now, alreadySent) {
  const due = [];
  for (const stop of stops) {
    const left = minutesUntil(stop.jamaat_at, now);
    for (const threshold of ALERT_MINUTES) {
      const id = `${stop.key}:${threshold}`;
      if (left <= threshold && left > 0 && !alreadySent.has(id)) due.push({ id, stop, threshold, left });
    }
  }
  return due;
}
