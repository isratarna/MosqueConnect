import { DEFAULT_LOCALE, formatTimeOfDay } from "./intl.js";

export function parseClockTime(timeStr, reference = new Date()) {
  const value = String(timeStr || "").trim();
  const match = value.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridian = match[3] ? match[3].toLowerCase() : null;

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute > 59) return null;

  if (meridian) {
    if (hour < 1 || hour > 12) return null;
    if (meridian === "pm" && hour < 12) hour += 12;
    if (meridian === "am" && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }

  return new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    hour,
    minute,
    0,
    0,
  );
}

// The API sends 24-hour ASCII times ("13:30"); they are only localised here, at
// the point of display. "bn-BD" renders Bangla digits (১:৩০ PM).
export function formatClockTime(timeStr, locale = DEFAULT_LOCALE) {
  const parsed = parseClockTime(timeStr);
  if (!parsed) return timeStr || "—";

  return formatTimeOfDay(parsed, locale);
}

export function dhuhrJamaatLabel(prayer, locale = DEFAULT_LOCALE, label = "Dhuhr") {
  const time = prayer?.Dhuhr || prayer?.dhuhr;
  if (!time) return null;
  return `${label} ${formatClockTime(time, locale)}`;
}
