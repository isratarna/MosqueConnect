export const ANNOUNCEMENT_ROUTE_BASE = "/community/announcements";

// Only announcements resolve through /api/announcements/{id}. Blood requests and
// volunteer opportunities share the community feed but have their own pages, so
// linking them here would produce a details URL that 404s.
export function isAnnouncementItem(item) {
  return item.category === "announcement";
}

export function getAnnouncementDetailsPath(id) {
  return `${ANNOUNCEMENT_ROUTE_BASE}/${encodeURIComponent(id)}`;
}

export function getAnnouncementUrgency(urgency) {
  if (urgency === "urgent" || urgency === "high") {
    return { label: "Urgent", tone: "urgent" };
  }

  if (urgency === "important" || urgency === "medium") {
    return { label: "Important", tone: "important" };
  }

  return { label: "Normal", tone: "normal" };
}
