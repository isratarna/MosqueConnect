import { DEFAULT_LOCALE } from "./intl.js";

// [Urmee · F5 Part 4] Optional { compact } gives "৳2.1M" for the impact tiles; narrowSymbol makes Intl
// print ৳ instead of "BDT". The locale (en/bn) comes before it, from the i18n work.
export function formatCampaignMoney(amount, currency = "BDT", locale = DEFAULT_LOCALE, { compact = false } = {}) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...(compact
      ? { notation: "compact", maximumFractionDigits: 1, currencyDisplay: "narrowSymbol" }
      : { minimumFractionDigits: Number(amount) % 1 ? 2 : 0, maximumFractionDigits: 2 }),
  }).format(Number(amount) || 0);
}

export function formatCampaignDate(value, locale = DEFAULT_LOCALE, fallback = "Not specified") {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function clampCampaignProgress(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}
