import { DEFAULT_LOCALE } from "./intl.js";

export function formatCampaignMoney(amount, currency = "BDT", locale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: Number(amount) % 1 ? 2 : 0,
    maximumFractionDigits: 2,
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
