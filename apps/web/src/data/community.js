// Categories the community feed can actually contain. Keep this in sync with the
// sources Community.jsx merges, so a ?category= link never selects an empty feed.
export const COMMUNITY_CATEGORIES = [
  { key: "all", label: "All updates" },
  { key: "announcement", label: "Announcements" },
  { key: "event", label: "Events" },
  { key: "blood", label: "Blood requests" },
  { key: "volunteer", label: "Volunteer" },
];

export function getCommunityCategory(category) {
  return COMMUNITY_CATEGORIES.find((item) => item.key === category);
}

export function isCommunityCategory(category) {
  return Boolean(getCommunityCategory(category));
}

export function getCommunityCategoryLabel(category) {
  return getCommunityCategory(category)?.label || "Community update";
}
