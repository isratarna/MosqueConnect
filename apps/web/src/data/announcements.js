import {
  COMMUNITY_UPDATES,
  getCommunityCategoryLabel,
} from "./community";
import { MOSQUES } from "./mosques";

export const ANNOUNCEMENT_ROUTE_BASE = "/community/announcements";

// Events have their own details flow in the project specification, so they are
// intentionally excluded from the reusable announcement route.
export function isAnnouncementItem(item) {
  return item.category !== "event";
}

export function getAnnouncementDetailsPath(id) {
  return `${ANNOUNCEMENT_ROUTE_BASE}/${encodeURIComponent(id)}`;
}

// Older locally saved mosque announcements did not have an id. Keep those
// records addressable while new announcements receive a persisted id on create.
export function getMosqueAnnouncementId(mosqueId, announcement, index) {
  return announcement.id || `mosque-${mosqueId}-announcement-${index}`;
}

export function createAnnouncementId() {
  return `announcement-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

function getMosqueById(id) {
  return MOSQUES.find((mosque) => mosque.id === Number(id));
}

function normalizeCommunityAnnouncement(item) {
  const mosque = item.mosqueId ? getMosqueById(item.mosqueId) : null;

  return {
    id: item.id,
    category: item.category,
    typeLabel: getCommunityCategoryLabel(item.category),
    title: item.title,
    description: item.description || item.summary,
    urgency: getAnnouncementUrgency(item.urgency),
    publishedLabel: item.publishedLabel,
    mosqueId: item.mosqueId,
    mosqueName: item.mosqueName,
    mosqueVerified: item.mosqueVerified,
    location: mosque?.address || item.area,
    area: item.area,
    contact: item.contact || mosque?.phone,
    publishedBy: mosque
      ? mosque.verified
        ? "Verified mosque admin"
        : `${mosque.name} community`
      : "MosqueConnect community",
  };
}

function normalizeMosqueAnnouncement(mosque, announcement, index) {
  return {
    id: getMosqueAnnouncementId(mosque.id, announcement, index),
    category: "announcement",
    typeLabel: "Mosque announcement",
    title: announcement.title,
    description: announcement.body,
    urgency: getAnnouncementUrgency(announcement.urgency),
    publishedLabel: announcement.date,
    mosqueId: mosque.id,
    mosqueName: mosque.name,
    mosqueVerified: mosque.verified,
    location: mosque.address,
    area: mosque.area,
    contact: mosque.phone,
    publishedBy: mosque.verified ? "Verified mosque admin" : `${mosque.name} community`,
  };
}

export function getAnnouncementById(id) {
  const communityItem = COMMUNITY_UPDATES.find(
    (item) => item.id === id && isAnnouncementItem(item),
  );

  if (communityItem) {
    return normalizeCommunityAnnouncement(communityItem);
  }

  for (const mosque of MOSQUES) {
    const index = (mosque.announcements || []).findIndex(
      (announcement, announcementIndex) => getMosqueAnnouncementId(mosque.id, announcement, announcementIndex) === id,
    );

    if (index !== -1) {
      return normalizeMosqueAnnouncement(mosque, mosque.announcements[index], index);
    }
  }

  return null;
}
