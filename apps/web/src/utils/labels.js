/*
 * Labels for values the API sends as stable codes or English names (statuses,
 * categories). The code is the translation key. A value that is not in the known
 * list falls back to a readable form of itself, so a new backend value shows up
 * untranslated instead of as a raw key or a missing-translation warning.
 *
 * The lists mirror the backend enums (apps/api/database/migrations); the locale
 * test checks that every entry has both an English and a Bangla translation.
 */

// [Urmee · VIVA] API pathay stable code (pending, verified...). Code ke key dhore translate kori. Test check kore shobar en+bn translation ache.
export const STATUS_VALUES = [
  "draft", "published", "active", "closed", "completed", "cancelled", "expired", "past",
  "pending", "approved", "rejected", "confirmed", "ai_reviewed", "under_human_review",
  "suspended", "reviewing", "resolved", "dismissed",
];

export const VERIFICATION_VALUES = ["unverified", "pending", "verified", "rejected"];

export const CAMPAIGN_CATEGORY_KEYS = [
  "mosque_development", "emergency_relief", "education", "food_essentials",
  "healthcare", "orphan_support", "community_welfare", "other",
];

export const EVENT_CATEGORY_KEYS = [
  "islamic_lecture", "quran_program", "community_gathering", "charity", "volunteer_activity",
  "youth_program", "workshop", "iftar", "educational_program", "other",
];

// "Food & Essentials" -> "food_essentials"
export function slugKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// "under_human_review" -> "Under Human Review"
export function humanize(value = "") {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Translates `value` under `namespace` when it is one of `known`, else humanizes it.
export function enumLabel(t, namespace, known, value) {
  if (value === null || value === undefined || value === "") return "";
  return known.includes(value) ? t(`${namespace}.${value}`) : humanize(value);
}

export function statusLabel(t, status) {
  if (status === null || status === undefined || status === "") return "";
  if (STATUS_VALUES.includes(status)) return t(`status.${status}`);
  if (VERIFICATION_VALUES.includes(status)) return t(`verification.${status}`);
  return humanize(status);
}

export function campaignCategoryLabel(t, category) {
  if (!category) return "";
  const key = slugKey(category);
  return CAMPAIGN_CATEGORY_KEYS.includes(key) ? t(`campaign.categories.${key}`) : category;
}

export function eventCategoryLabel(t, category) {
  if (!category) return t("event.categoryOther");
  const key = slugKey(category);
  return EVENT_CATEGORY_KEYS.includes(key) ? t(`event.categories.${key}`) : category;
}
