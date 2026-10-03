/*
 * Locale-aware number, date and time formatting.
 *
 * Everything here takes an Intl locale tag ("en-BD" or "bn-BD"), which the
 * `useLocale` hook derives from the active language. "bn-BD" renders Bangla
 * digits (১:৩০, ২৫ আগ, ২০২৬). The API keeps speaking ASCII digits and 24-hour
 * times; formatting only ever happens at the point of display.
 */

export const INTL_LOCALES = { en: "en-BD", bn: "bn-BD" };
export const DEFAULT_LOCALE = INTL_LOCALES.en;

// Maps any language or locale tag ("bn", "bn-BD", "en-US", undefined) to one of
// the two languages the interface supports.
// [Urmee · VIVA] Je kono tag (bn, bn-BD, en-US) ke "bn" ba "en" e ane.
export function languageOf(value) {
  return String(value || "").toLowerCase().startsWith("bn") ? "bn" : "en";
}

export function intlLocale(language) {
  return INTL_LOCALES[languageOf(language)];
}

// [Urmee · VIVA] Bangla hole 25 -> ২৫. Intl.NumberFormat diye.
export function formatNumber(value, locale = DEFAULT_LOCALE, options) {
  const number = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(number)) {
    return value === null || value === undefined ? "" : String(value);
  }
  return new Intl.NumberFormat(locale, options).format(number);
}

export function formatPercent(value, locale = DEFAULT_LOCALE) {
  return formatNumber(Number(value) / 100, locale, { style: "percent", maximumFractionDigits: 0 });
}

export function formatDate(date, locale = DEFAULT_LOCALE, options = { day: "numeric", month: "short", year: "numeric" }) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, options).format(date);
}

// Bangla names the part of the day ("১:৩০ দুপুর", "৪:৫০ ভোর") instead of the
// Latin AM/PM that English uses.
// [Urmee · VIVA] Bangla te AM/PM er bodole bhor/dupur/shondhya dekhai.
export function timeOptions(locale = DEFAULT_LOCALE) {
  return {
    hour: "numeric",
    minute: "2-digit",
    ...(languageOf(locale) === "bn" ? { dayPeriod: "short" } : {}),
  };
}

// "৫ সেপ, ২০২৬, ৭:৫৫ সন্ধ্যা" / "Sep 5, 2026, 7:55 PM"
// [Urmee · VIVA] Tarikh+shomoy: Bangla te Bangla digit, English e "Sep 5, 2026, 7:55 PM".
export function formatDateTime(value, locale = DEFAULT_LOCALE) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const options = languageOf(locale) === "bn"
    ? { day: "numeric", month: "short", year: "numeric", ...timeOptions(locale) }
    : { dateStyle: "medium", timeStyle: "short" };
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatTimeOfDay(date, locale = DEFAULT_LOCALE) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, timeOptions(locale)).format(date);
}

// Formats a date-only API value ("2026-08-25") without the timezone shift that
// `new Date("2026-08-25")` would introduce.
export function parseDateOnly(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Formats an ISO timestamp or date-only string for display, returning the
// original text when it cannot be parsed.
export function formatApiDate(value, locale = DEFAULT_LOCALE, options) {
  if (!value) return "";
  const text = String(value);
  const date = text.includes("T") ? new Date(text) : parseDateOnly(text);
  return formatDate(date, locale, options) || text;
}
