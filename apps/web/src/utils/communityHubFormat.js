// ---- Labels shared by the lost & found, feedback and goods screens ----------

export const LOST_FOUND_CATEGORIES = [
  ["phone", "Phone"],
  ["wallet", "Wallet"],
  ["keys", "Keys"],
  ["bag", "Bag"],
  ["clothing", "Clothing"],
  ["shoes", "Shoes"],
  ["documents", "Documents"],
  ["other", "Other"],
];

export const LOST_FOUND_STATUS = {
  open: ["Open", "bg-primary"],
  returned: ["Returned", "bg-success"],
  closed: ["Closed", "bg-secondary"],
};

export const COMPLAINT_CATEGORIES = [
  ["cleanliness", "Cleanliness"],
  ["facilities", "Facilities"],
  ["timing", "Prayer timing"],
  ["safety", "Safety"],
  ["management", "Management"],
  ["suggestion", "Suggestion"],
  ["other", "Other"],
];

export const COMPLAINT_STATUS = {
  open: ["Open", "bg-warning text-dark"],
  in_progress: ["In progress", "bg-info text-dark"],
  resolved: ["Resolved", "bg-success"],
  dismissed: ["Dismissed", "bg-secondary"],
};

export const GOODS_STATUS = {
  pending: ["Waiting for the mosque", "bg-warning text-dark"],
  accepted: ["Accepted", "bg-info text-dark"],
  received: ["Received", "bg-success"],
  declined: ["Declined", "bg-secondary"],
};

// [Urmee · i18n community] Translated label for a code the API sends ("in_progress", "wallet", ...). `group` is the hub.<group>
// namespace in the locale files; an unknown code shows the fallback (or the code itself), never a missing-key warning.
export const hubLabelT = (t, group, key, fallback) => (key ? t(`hub.${group}.${key}`, { defaultValue: fallback ?? String(key) }) : "");

export function labelOf(pairs, key) {
  return pairs.find(([value]) => value === key)?.[1] || key || "";
}

/** Query string for GET /api/lost-found, leaving out empty filters. */
export function lostFoundQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * The same figures as numbers plus translation keys, so the home page can format
 * them for the active language (Bangla digits, "২১ লাখ") and animate them.
 */
export function impactTilesFrom(stats) {
  if (!stats) return [];
  return [
    { key: "mosques", value: Number(stats.mosques_count) || 0, compact: true, labelKey: "home.impact.mosques" },
    { key: "members", value: Number(stats.members_count) || 0, compact: true, labelKey: "home.impact.members" },
    { key: "donations", value: Number(stats.donations_confirmed_total) || 0, prefix: "৳", compact: true, labelKey: "home.impact.donations" },
    { key: "volunteers", value: Number(stats.volunteer_signups_count) || 0, compact: true, labelKey: "home.impact.volunteers" },
  ];
}
/** Turn GET /api/stats/public into the home page's four impact tiles (numbers; the component formats them). */
// [Urmee · F5 Part 4] Maps GET /api/stats/public to four numeric tiles; the component does the
// formatting (compact, ৳).
export function impactStatsFrom(stats) {
  if (!stats) return [];
  return [
    { key: "mosques", value: Number(stats.mosques_count) || 0, label: "Mosques connected" },
    { key: "members", value: Number(stats.members_count) || 0, label: "Community members" },
    { key: "donations", value: Number(stats.donations_confirmed_total) || 0, label: "Donations confirmed", money: true },
    { key: "volunteers", value: Number(stats.volunteer_signups_count) || 0, label: "Volunteer sign-ups" },
  ];
}

/**
 * The goods form's option labels (as in SupportForm.jsx) mapped to the values
 * POST /api/mosques/{mosque}/goods-donations accepts.
 */
export const GOODS_CONDITIONS = [
  ["new", "New"],
  ["gently_used", "Gently Used"],
  ["used", "Used"],
];

export const GOODS_DELIVERY_METHODS = [
  ["drop_off", "I will deliver to the mosque"],
  ["pickup", "Request pickup from my location"],
  ["discuss", "Need to discuss with the mosque"],
];

/** API value for a SupportForm label, e.g. "Gently Used" → "gently_used". */
export function goodsValueFor(pairs, label) {
  return pairs.find(([, text]) => text === label)?.[0] || null;
}
