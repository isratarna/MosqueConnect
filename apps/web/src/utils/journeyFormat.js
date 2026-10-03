/*
 * Journey planner ar "next jamat you can catch" er pure formatter ar constant
 * (node --test e chalano jay, kono API import nei).
 */
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
export const PRESET_PLACES = [
  { label: "Dhaka (Gulistan)", lat: 23.723, lng: 90.412 },
  { label: "Chattogram (GEC)", lat: 22.3593, lng: 91.8214 },
  { label: "Comilla (Kandirpar)", lat: 23.4607, lng: 91.1809 },
  { label: "Feni", lat: 23.0159, lng: 91.3976 },
  { label: "Sylhet", lat: 24.8949, lng: 91.8687 },
  { label: "Mymensingh", lat: 24.7471, lng: 90.4203 },
  { label: "Rajshahi", lat: 24.3745, lng: 88.6042 },
  { label: "Cox's Bazar", lat: 21.4272, lng: 92.0058 },
];

// "14 min" ba "1h 20m".
export function formatMinutes(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0));
  if (value < 60) return `${value} min`;
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

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
