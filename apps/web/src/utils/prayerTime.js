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

export function formatClockTime(timeStr) {
  const parsed = parseClockTime(timeStr);
  if (!parsed) return timeStr || "—";

  return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function dhuhrJamaatLabel(prayer) {
  const time = prayer?.Dhuhr || prayer?.dhuhr;
  if (!time) return null;
  return `Dhuhr ${formatClockTime(time)}`;
}
