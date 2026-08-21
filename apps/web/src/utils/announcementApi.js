import { apiUrl } from "../config.js";
import { getAnnouncementById, getAnnouncementUrgency } from "../data/announcements";

export async function fetchAnnouncementById(id) {
  const announcementId = String(id ?? "").trim();
  if (!announcementId) {
    return Promise.reject(new Error("An announcement id is required."));
  }

  const response = await fetch(apiUrl(`/api/announcements/${encodeURIComponent(announcementId)}`), {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));

  if (response.ok && payload.data && typeof payload.data === "object") {
    return normalizeAnnouncement(payload.data);
  }

  if (response.status !== 404) {
    throw new Error(payload.message || "Announcement details could not be loaded.");
  }

  const local = getAnnouncementById(announcementId);
  if (local) return local;

  throw new Error(payload.message || "Announcement not found.");
}

export function normalizeAnnouncement(record) {
  const mosque = record.mosque && typeof record.mosque === "object" ? record.mosque : {};
  const publishedAt = record.published_at || record.date || "";

  return {
    id: record.id,
    category: "announcement",
    typeLabel: "Mosque announcement",
    title: record.title,
    description: record.body || record.description || "",
    urgency: getAnnouncementUrgency(record.urgency),
    publishedLabel: typeof publishedAt === "string" && publishedAt.includes("T")
      ? publishedAt.slice(0, 10)
      : publishedAt,
    mosqueId: record.mosque_id || mosque.id,
    mosqueName: mosque.name || record.mosqueName,
    mosqueVerified: mosque.verified === true || mosque.verification_status === "verified",
    location: mosque.address || record.location,
    area: record.area,
    contact: mosque.phone || record.contact,
    publishedBy: mosque.verified === true || mosque.verification_status === "verified"
      ? "Verified mosque admin"
      : mosque.name
        ? `${mosque.name} community`
        : "MosqueConnect community",
  };
}
