// Categories the community feed can actually contain. Keep this in sync with the
// sources Community.jsx merges, so a ?category= link never selects an empty feed.
export const COMMUNITY_CATEGORIES = [
  { key: "all", labelKey: "community.categories.all" },
  { key: "announcement", labelKey: "community.categories.announcement" },
  { key: "event", labelKey: "community.categories.event" },
  { key: "blood", labelKey: "community.categories.blood" },
  { key: "volunteer", labelKey: "community.categories.volunteer" },
  { key: "lost_found", labelKey: "community.categories.lost_found" },
];

// Stands in for a mosque name on blood requests, which have no mosque. It is
// only a filter value; cards and the mosque filter show a translated label.
export const BLOOD_SOURCE = "__community_blood__";

export function getCommunityCategory(category) {
  return COMMUNITY_CATEGORIES.find((item) => item.key === category);
}

export function isCommunityCategory(category) {
  return Boolean(getCommunityCategory(category));
}

export function getCommunityCategoryLabelKey(category) {
  return getCommunityCategory(category)?.labelKey || "community.categories.default";
}
