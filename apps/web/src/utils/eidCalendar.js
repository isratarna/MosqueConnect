// Eid jamaat times are local Bangladesh time. Bangladesh has no daylight
// saving, so a fixed UTC+6 offset converts them to UTC for calendar files.
const BANGLADESH_UTC_OFFSET_MINUTES = 6 * 60;
const JAMAAT_DURATION_MINUTES = 60;

function jamaatStartUtc(jamaat) {
  const [year, month, day] = String(jamaat?.date || "").split("-").map(Number);
  const [hour, minute] = String(jamaat?.jamaat_time || "").split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isInteger)) return null;

  return new Date(Date.UTC(year, month - 1, day, hour, minute) - BANGLADESH_UTC_OFFSET_MINUTES * 60_000);
}

function calendarStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function eidJamaatTitle(jamaat) {
  const mosque = jamaat?.mosque?.name;
  return `${jamaat?.eid_label || "Eid"} jamaat${mosque ? ` – ${mosque}` : ""}`;
}

export function eidJamaatLocation(jamaat) {
  const mosque = jamaat?.mosque;
  if (jamaat?.location_name && !jamaat?.at_mosque) {
    return [jamaat.location_name, mosque?.name].filter(Boolean).join(", ");
  }
  return [jamaat?.location_name, mosque?.name, mosque?.address].filter(Boolean).join(", ");
}

export function eidJamaatDetails(jamaat) {
  return [
    jamaat?.khutbah_language ? `Khutbah: ${jamaat.khutbah_language}` : null,
    jamaat?.women_arrangement ? "Arrangements for women" : null,
    jamaat?.notes || null,
  ].filter(Boolean).join("\n");
}

function escapeIcs(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

/** An iCalendar (.ics) file for one Eid jamaat, or null if its date or time is invalid. */
export function buildEidJamaatIcs(jamaat, now = new Date()) {
  const start = jamaatStartUtc(jamaat);
  if (!start) return null;
  const end = new Date(start.getTime() + JAMAAT_DURATION_MINUTES * 60_000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MosqueConnect//Eid jamaat//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:eid-jamaat-${jamaat.id}@mosqueconnect`,
    `DTSTAMP:${calendarStamp(now)}`,
    `DTSTART:${calendarStamp(start)}`,
    `DTEND:${calendarStamp(end)}`,
    `SUMMARY:${escapeIcs(eidJamaatTitle(jamaat))}`,
    `LOCATION:${escapeIcs(eidJamaatLocation(jamaat))}`,
  ];
  const details = eidJamaatDetails(jamaat);
  if (details) lines.push(`DESCRIPTION:${escapeIcs(details)}`);
  if (Number.isFinite(jamaat.latitude) && Number.isFinite(jamaat.longitude)) {
    lines.push(`GEO:${jamaat.latitude};${jamaat.longitude}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");

  return `${lines.join("\r\n")}\r\n`;
}

/** A link that opens Google Calendar with the jamaat pre-filled. */
export function googleCalendarUrl(jamaat) {
  const start = jamaatStartUtc(jamaat);
  if (!start) return null;
  const end = new Date(start.getTime() + JAMAAT_DURATION_MINUTES * 60_000);

  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: eidJamaatTitle(jamaat),
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    location: eidJamaatLocation(jamaat),
    details: eidJamaatDetails(jamaat),
  });
  return `https://calendar.google.com/calendar/render?${query}`;
}

/** The text used when sharing a jamaat. */
export function eidJamaatShareText(jamaat, formatTime = (time) => time) {
  return `${eidJamaatTitle(jamaat)}: ${jamaat.date} at ${formatTime(jamaat.jamaat_time)}, ${eidJamaatLocation(jamaat)}`;
}
