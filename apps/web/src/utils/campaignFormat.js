// [Urmee · F5 Part 4] New optional { compact } gives "৳2.1M" for the impact tiles; narrowSymbol makes
// Intl print ৳ instead of "BDT".
export function formatCampaignMoney(amount, currency = "BDT", { compact = false } = {}) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    ...(compact
      ? { notation: "compact", maximumFractionDigits: 1, currencyDisplay: "narrowSymbol" }
      : { minimumFractionDigits: Number(amount) % 1 ? 2 : 0, maximumFractionDigits: 2 }),
  }).format(Number(amount) || 0);
}

export function formatCampaignDate(value) {
  if (!value) return "Not specified";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Not specified";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function clampCampaignProgress(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}
