// Small helpers for the mosque profile page (kept free of React so they can be tested).

/** "Updated today / yesterday / 3 days ago / on 4 Oct 2026" from an ISO timestamp, or "" when unknown. */
// [Urmee · F3 Part 1] "Updated 3 days ago" for the prayer-times card, from schedule_updated_at.
// With a `t` function (and the active locale) the text follows the interface language.
export function updatedAgoLabel(value, now = new Date(), t, locale = "en-GB") {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days <= 0) return t ? t("mosque.updatedToday") : "Updated today";
  if (days === 1) return t ? t("mosque.updatedYesterday") : "Updated yesterday";
  if (days < 30) return t ? t("mosque.updatedDaysAgo", { count: days }) : `Updated ${days} days ago`;
  const formatted = date.toLocaleDateString(t ? locale : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  return t ? t("mosque.updatedOn", { date: formatted }) : `Updated on ${formatted}`;
}

/** https://wa.me link for a Bangladeshi number typed as 017…, +88017… or 88017…; null if it isn't one. */
// [Urmee · F3 Part 1] Builds a wa.me link; Bangladeshi numbers typed as 017…, +88017… or 88017… all
// become 8801…; anything else gives null (no broken link).
export function whatsappUrl(number) {
  const digits = String(number || "").replace(/\D/g, "").replace(/^880/, "").replace(/^0+/, "");
  return /^1[3-9]\d{8}$/.test(digits) ? `https://wa.me/880${digits}` : null;
}

/** Only http(s) links are ever rendered as links (blocks javascript: and friends). */
// [Urmee · F3 Part 1] Only http(s) links are ever rendered, so a stored "javascript:…" value can't
// become a clickable link.
export function safeWebUrl(value) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)"'])/g;

/**
 * Splits plain text into [{ type: "text" | "link", value }] so URLs can become links
 * without ever rendering raw HTML (React escapes the text parts).
 */
// [Urmee · F3 Part 1] Turns URLs in announcement text into links without rendering raw HTML: React
// escapes the text parts, so there is no XSS risk.
export function linkifyParts(text) {
  return String(text ?? "")
    .split(URL_PATTERN)
    .filter((part) => part !== "")
    .map((part) => (/^https?:\/\//.test(part) && safeWebUrl(part) ? { type: "link", value: part } : { type: "text", value: part }));
}

/** The text cut at a word boundary with an ellipsis when longer than `limit`; the full text otherwise. */
// [Urmee · F3 Part 1] Long announcement bodies are cut at a word boundary and get a "Show more"
// button.
export function clampText(text, limit = 220) {
  const value = String(text ?? "");
  if (value.length <= limit) return { text: value, clamped: false };
  const cut = value.slice(0, limit);
  return { text: `${cut.slice(0, Math.max(cut.lastIndexOf(" "), limit * 0.6))}…`, clamped: true };
}

/** Pinned announcements first, then newest first; at most `limit`. */
// [Urmee · F3 Part 1] Shows the latest 5, pinned first (works once the API sends a pinned flag).
export function latestAnnouncements(announcements, limit = 5) {
  return [...announcements]
    .sort((a, b) => Number(Boolean(b.pinned || b.is_pinned)) - Number(Boolean(a.pinned || a.is_pinned))
      || String(b.published_at || b.date || "").localeCompare(String(a.published_at || a.date || "")))
    .slice(0, limit);
}
