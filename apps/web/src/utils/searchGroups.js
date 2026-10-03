// The result groups returned by GET /api/search, in display order.
// `seeAll` is the page that lists everything for a group. Browse, Community and
// Campaigns read the `search` parameter; Volunteers has no text filter yet.
export const SEARCH_GROUPS = [
  { key: "mosques", label: "Mosques", seeAll: (q) => `/browse?search=${encodeURIComponent(q)}` },
  { key: "events", label: "Events", seeAll: (q) => `/community?category=event&search=${encodeURIComponent(q)}` },
  { key: "campaigns", label: "Campaigns", seeAll: (q) => `/campaigns?search=${encodeURIComponent(q)}` },
  { key: "announcements", label: "Announcements", seeAll: (q) => `/community?category=announcement&search=${encodeURIComponent(q)}` },
  { key: "volunteer_opportunities", label: "Volunteering", seeAll: () => "/volunteers" },
];

export const MIN_QUERY_LENGTH = 2; // the API rejects anything shorter

export const searchPath = (query) => `/search?q=${encodeURIComponent(query.trim())}`;

export const isSearchable = (query) => query.trim().length >= MIN_QUERY_LENGTH;

/** Groups that have at least one hit, in display order, from an API `data` object. */
export function nonEmptyGroups(data) {
  return SEARCH_GROUPS
    .map((group) => ({ ...group, total: data?.[group.key]?.total ?? 0, items: data?.[group.key]?.items ?? [] }))
    .filter((group) => group.items.length > 0);
}
