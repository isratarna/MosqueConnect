// Helpers for Ramadan mode: countdown phases, month days and the "paste from spreadsheet" parser.
// Everything works on plain "YYYY-MM-DD" and "HH:MM" strings (what the API sends), never on
// time-zone-shifted Date objects, so a date can't slip a day.
import { parseClockTime } from "./prayerTime.js";

// [Urmee · VIVA] pad(5) -> "05". Time/date string banate lagbe (YYYY-MM-DD, HH:MM).
const pad = (value) => String(value).padStart(2, "0");

/** "YYYY-MM-DD" for a Date in the local time zone. */
// [Urmee · VIVA] Aajker tarikh "YYYY-MM-DD" string e. Date object er jaygay string rakhi, tai timezone er karone tarikh ekdin age/pore hoye jay na.
export const dateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** "2026-02-28" + 1 -> "2026-03-01". */
// [Urmee · VIVA] Tarikh e din jog kora ("2026-02-28" + 1 = "2026-03-01"). UTC diye kori jate daylight/timezone e bhul na hoy.
export function addDays(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Every day from `startsOn` to `endsOn` (inclusive) as "YYYY-MM-DD". */
// [Urmee · VIVA] Period er prothom theke shesh din porjonto shob tarikh er list. Month grid er protita row er jonno. 400 er upore jabe na (safety).
export function daysBetween(startsOn, endsOn) {
  const days = [];
  for (let day = startsOn; day <= endsOn && days.length < 400; day = addDays(day, 1)) days.push(day);
  return days;
}

/**
 * Where we are in the Ramadan day:
 *  - before Sehri ends  -> { phase: "sehri",  targetAt: today's Sehri end }
 *  - before Iftar       -> { phase: "iftar",  targetAt: today's Iftar }
 *  - after Iftar        -> { phase: "sehri",  targetAt: tomorrow's Sehri end } (when tomorrow is in the table)
 *  - otherwise          -> { phase: "done" }
 */
// [Urmee · VIVA] COUNTDOWN er brain. Ekhon kon phase? Sehri shesh hoyni -> sehri, Iftar hoyni -> iftar, Iftar er pore -> kalker Sehri. Kichu na thakle "done". Card ar home banner dui jaygay-i eta use hoy.
export function ramadanPhase(timings, now = new Date()) {
  const todayKey = dateKey(now);
  const byDate = Object.fromEntries((timings || []).map((timing) => [timing.date, timing]));
  const today = byDate[todayKey] ?? null;
  const tomorrow = byDate[addDays(todayKey, 1)] ?? null;

  if (today) {
    const sehriEnds = parseClockTime(today.sehri_ends, now);
    const iftar = parseClockTime(today.iftar, now);
    if (sehriEnds && now < sehriEnds) return { phase: "sehri", targetAt: sehriEnds, today };
    if (iftar && now < iftar) return { phase: "iftar", targetAt: iftar, today };
  }
  if (tomorrow) {
    const tomorrowNow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const sehriEnds = parseClockTime(tomorrow.sehri_ends, tomorrowNow);
    if (sehriEnds) return { phase: "sehri", targetAt: sehriEnds, today };
  }
  return { phase: "done", targetAt: null, today };
}

/** { hours, minutes, seconds } until `targetAt` (never negative). */
// [Urmee · VIVA] Target time porjonto koto ghonta/minute/second baki. Math.max(0, ...) diye minus hote dei na.
export function timeLeft(targetAt, now = new Date()) {
  const total = Math.max(0, Math.floor((targetAt.getTime() - now.getTime()) / 1000));
  return { hours: Math.floor(total / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
}

// ---------------------------------------------------------------- paste from a spreadsheet

// [Urmee · VIVA] Regex: "5:10", "5.10", "5:10 PM" -- Excel theke paste kora text er time khuje ber kore.
const TIME = /(\d{1,2})[:.](\d{2})\s*([AaPp][Mm])?/g;
const DATE_ISO = /(\d{4})-(\d{1,2})-(\d{1,2})/;
const DATE_DMY = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/;

// [Urmee · VIVA] Paste kora time ke "HH:MM" (24h) banay. AM/PM thakle oi onujayi. Na thakle Iftar/Taraweeh (assumePm) er "6:15" ke 18:15 dhori, karon eigulo shondhyar shomoy.
function toClock(hour, minute, meridian, assumePm) {
  let h = Number(hour);
  const m = Number(minute);
  if (m > 59 || h > 23) return null;
  if (meridian) {
    const pm = meridian.toLowerCase() === "pm";
    if (h < 1 || h > 12) return null;
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  } else if (assumePm && h < 12) {
    h += 12; // Iftar and Taraweeh are evening times; spreadsheets often write "6:15" for 18:15
  }
  return `${pad(h)}:${pad(m)}`;
}

/**
 * Turns text copied from Excel (tab-separated; commas work too) into Ramadan rows.
 * Each row needs two or three times: Sehri end, Iftar and, optionally, Taraweeh. A date in the row
 * (2027-02-10 or 10/02/2027) is used when present; otherwise rows start at the period's first day.
 * Header and blank rows are skipped. Returns { rows, problems }.
 */
// [Urmee · VIVA] "Paste from spreadsheet" er parser. Protita line e 2-3 ta time (Sehri, Iftar, optional Taraweeh). Date thakle (ISO ba DD/MM/YYYY) seta, na thakle period er prothom din theke seriyal. Header/faka line skip. Bhul line problems e jay.
export function parseTimingsPaste(text, period) {
  const days = daysBetween(period.starts_on, period.ends_on);
  const rows = [];
  const problems = [];
  let sequence = 0;

  String(text || "").split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const times = [...line.matchAll(TIME)];
    if (times.length < 2) return; // a header such as "Day  Date  Sehri  Iftar"

    let date = null;
    const iso = DATE_ISO.exec(line);
    const dmy = DATE_DMY.exec(line);
    if (iso) date = `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;
    else if (dmy) date = `${dmy[3]}-${pad(dmy[2])}-${pad(dmy[1])}`;
    else date = days[sequence] ?? null;
    sequence += 1;

    const sehri = toClock(times[0][1], times[0][2], times[0][3], false);
    const iftar = toClock(times[1][1], times[1][2], times[1][3], true);
    const taraweeh = times[2] ? toClock(times[2][1], times[2][2], times[2][3], true) : null;

    if (!date || !days.includes(date)) problems.push({ line: index + 1, reason: "date" });
    else if (!sehri || !iftar) problems.push({ line: index + 1, reason: "time" });
    else rows.push({ date, sehri_ends: sehri, iftar, taraweeh_time: taraweeh });
  });

  return { rows, problems };
}

/** The same Taraweeh time on every row. */
// [Urmee · VIVA] "Same Taraweeh time" -- shob row te ek Taraweeh time boshay.
export const applyTaraweeh = (rows, time) => rows.map((row) => ({ ...row, taraweeh_time: time || null }));

/** One editable row per day of the period, filled from saved timings where they exist. */
// [Urmee · VIVA] Period er protita din er jonno ekta editable row banay. Age save kora time thakle seta bosay, na thakle faka.
export function rowsForPeriod(period, saved = []) {
  const byDate = Object.fromEntries(saved.map((timing) => [timing.date, timing]));
  return daysBetween(period.starts_on, period.ends_on).map((date) => ({
    date,
    sehri_ends: byDate[date]?.sehri_ends || "",
    iftar: byDate[date]?.iftar || "",
    taraweeh_time: byDate[date]?.taraweeh_time || "",
  }));
}

/** Only complete rows (both Sehri and Iftar) are saved; blank days are left out. */
// [Urmee · VIVA] Save er age: shudhu jei row te Sehri ar Iftar dutoi ache. Faka din API te pathai na.
export const completeRows = (rows) => rows
  .filter((row) => row.sehri_ends && row.iftar)
  .map((row) => ({ date: row.date, sehri_ends: row.sehri_ends, iftar: row.iftar, taraweeh_time: row.taraweeh_time || null }));
