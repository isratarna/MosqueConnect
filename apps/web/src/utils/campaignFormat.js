export function formatCampaignMoney(amount, currency = "BDT") {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    minimumFractionDigits: Number(amount) % 1 ? 2 : 0,
    maximumFractionDigits: 2,
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
