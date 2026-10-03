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

// The API marks each prayer with where its time came from: "mosque" when the
// mosque published it, "calculated" when it was estimated from the location.
export function isEstimatedPrayer(sources, label) {
  return sources?.[label] === "calculated";
}

/**
 * The next jamat still to come today from a prayer_schedule list
 * ([{ label, jamaat_time }]); after the last one, tomorrow's first jamat.
 * Returns { label, time, tomorrow } or null when no times are set.
 */
// [Urmee · F1 Part 3] The next jamat still to come today; after the last one, tomorrow's first. Fixes
// cards that always showed Dhuhr.
export function nextJamaat(schedule, now = new Date()) {
  const entries = (Array.isArray(schedule) ? schedule : [])
    .map((entry) => ({ label: entry.label || entry.prayer, time: entry.jamaat_time, at: parseClockTime(entry.jamaat_time, now) }))
    .filter((entry) => entry.label && entry.at)
    .sort((a, b) => a.at - b.at);
  const upcoming = entries.find((entry) => entry.at > now);
  const pick = upcoming ?? entries[0];
  return pick ? { label: pick.label, time: pick.time, tomorrow: !upcoming } : null;
}

/**
 * The next jamat from a mosque's `prayer` summary ({ Fajr: "05:00", ... }) as
 * { prayer: "Asr", text: "Asr 4:30 PM", tomorrow }, or null when no times are set.
 */
// [Urmee · F1 Part 3] Same, from a mosque's `prayer` summary ({ Fajr: "05:00", … }).
export function nextJamaatLabel(prayer, now = new Date()) {
  const entries = Object.entries(prayer || {}).map(([label, time]) => ({ label, jamaat_time: time }));
  const next = nextJamaat(entries, now);
  if (!next) return null;
  return { prayer: next.label, text: `${next.label} ${formatClockTime(next.time)}${next.tomorrow ? " (tomorrow)" : ""}`, tomorrow: next.tomorrow };
}
