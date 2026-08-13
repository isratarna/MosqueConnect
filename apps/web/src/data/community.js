/*
 * Community hub placeholder data (Phase 1).
 *
 * These exports mirror the shape expected from the future Community API. The
 * page deliberately reads only from this module, so the static list can be
 * replaced with API calls without changing the UI components.
 */

export const COMMUNITY_CATEGORIES = [
  { key: "all", label: "All updates" },
  { key: "announcement", label: "Announcements" },
  { key: "prayer", label: "Prayer updates" },
  { key: "event", label: "Events" },
  { key: "blood", label: "Blood requests" },
  { key: "volunteer", label: "Volunteer" },
  { key: "lost-found", label: "Lost & Found" },
  { key: "complaint", label: "Complaint" },
  { key: "suggestion", label: "Suggestion" },
  { key: "notice", label: "Other notices" },
];

export const COMMUNITY_UPDATES = [
  {
    id: "urgent-janazah",
    category: "announcement",
    title: "Janazah prayer after Asr today",
    summary: "Community members are requested to attend the Janazah prayer immediately after Asr.",
    mosqueId: 3,
    mosqueName: "Dhanmondi Jame Masjid",
    mosqueVerified: false,
    area: "Dhanmondi",
    urgency: "urgent",
    publishedLabel: "Today, 2:15 PM",
    dateGroup: "today",
  },
  {
    id: "urgent-blood",
    category: "blood",
    title: "O+ blood needed for an emergency case",
    summary: "Two units are needed at Dhaka Medical College Hospital. Eligible donors can respond through the future donor flow.",
    mosqueId: 1,
    mosqueName: "Baitul Mukarram National Mosque",
    mosqueVerified: true,
    area: "Purana Paltan",
    urgency: "urgent",
    publishedLabel: "Today, 11:30 AM",
    dateGroup: "today",
  },
  {
    id: "prayer-maghrib",
    category: "prayer",
    title: "Maghrib Jamat time updated",
    summary: "Maghrib Jamat will begin at 6:55 PM from today. Please arrive a few minutes early.",
    mosqueId: 2,
    mosqueName: "Gulshan Central Mosque",
    mosqueVerified: true,
    area: "Gulshan",
    urgency: "important",
    publishedLabel: "Today, 9:00 AM",
    dateGroup: "today",
  },
  {
    id: "event-tafsir",
    category: "event",
    title: "Weekly Tafsir class: Surah Al-Baqarah",
    summary: "Join the Friday evening Tafsir session led by the head Imam. All community members are welcome.",
    mosqueId: 1,
    mosqueName: "Baitul Mukarram National Mosque",
    mosqueVerified: true,
    area: "Purana Paltan",
    urgency: "normal",
    publishedLabel: "Friday, 22 August · 7:30 PM",
    dateGroup: "upcoming",
  },
  {
    id: "volunteer-iftar",
    category: "volunteer",
    title: "Volunteers needed for community meal distribution",
    summary: "Help prepare and distribute meal packs for families in the surrounding area this weekend.",
    mosqueId: 4,
    mosqueName: "Uttara Sector 7 Mosque",
    mosqueVerified: false,
    area: "Uttara",
    urgency: "important",
    publishedLabel: "Saturday, 23 August · 3:00 PM",
    dateGroup: "upcoming",
  },
  {
    id: "lost-found-umbrella",
    category: "lost-found",
    title: "Found: black umbrella near the main entrance",
    summary: "An umbrella was found after Jummah. Please contact the mosque office with a description to collect it.",
    mosqueId: 5,
    mosqueName: "Mirpur DOHS Jame Masjid",
    mosqueVerified: false,
    area: "Mirpur",
    urgency: "normal",
    publishedLabel: "Yesterday",
    dateGroup: "this-week",
  },
  {
    id: "notice-womens-area",
    category: "notice",
    title: "Women's prayer area entrance temporarily relocated",
    summary: "Please use the north-side entrance while maintenance work is completed this week.",
    mosqueId: 8,
    mosqueName: "Bashundhara Riverview Mosque",
    mosqueVerified: true,
    area: "Bashundhara",
    urgency: "important",
    publishedLabel: "Yesterday",
    dateGroup: "this-week",
  },
  {
    id: "event-quran-camp",
    category: "event",
    title: "Children's Quran learning circle",
    summary: "A supervised weekend Quran learning circle for children aged 6–12. Families may register at the mosque office.",
    mosqueId: 7,
    mosqueName: "Mohammadpur Bihari Camp Mosque",
    mosqueVerified: false,
    area: "Mohammadpur",
    urgency: "normal",
    publishedLabel: "Sunday, 24 August · 4:00 PM",
    dateGroup: "upcoming",
  },
  {
    id: "complaint-feedback",
    category: "complaint",
    title: "Community feedback channel now available",
    summary: "Suggestions and non-emergency concerns will be privately reviewed by the appropriate mosque or platform team in a future release.",
    mosqueName: "MosqueConnect community",
    area: "Dhaka",
    urgency: "normal",
    publishedLabel: "3 days ago",
    dateGroup: "this-week",
  },
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
