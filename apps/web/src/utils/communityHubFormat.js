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

/** Turn GET /api/stats/public into the home page's impact tiles. */
export function impactStatsFrom(stats) {
  if (!stats) return [];
  const compact = (value) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
  return [
    { key: "mosques", value: compact(stats.mosques_count), label: "Mosques listed" },
    { key: "members", value: compact(stats.members_count), label: "Community members" },
    { key: "donations", value: `৳${compact(stats.donations_confirmed_total)}`, label: "Donations confirmed" },
    { key: "volunteers", value: compact(stats.volunteer_signups_count), label: "Volunteer sign-ups" },
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
