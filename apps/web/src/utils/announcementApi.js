import { apiUrl } from "../config.js";
import { getAnnouncementUrgency } from "../data/announcements";
import { translate } from "../i18n/translate.js";
import { networkFetch } from "./network.js";

export async function fetchAnnouncementById(id) {
  const announcementId = String(id ?? "").trim();
  if (!announcementId) {
    return Promise.reject(new Error(translate("error.announcementIdRequired")));
  }

  const response = await networkFetch(apiUrl(`/api/announcements/${encodeURIComponent(announcementId)}`), {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));

  if (response.ok && payload.data && typeof payload.data === "object") {
    return normalizeAnnouncement(payload.data);
  }

  if (response.status !== 404) {
    throw new Error(payload.message || translate("error.announcementLoad"));
  }


  throw new Error(payload.message || translate("error.announcementNotFound"));
}

export function normalizeAnnouncement(record) {
  const mosque = record.mosque && typeof record.mosque === "object" ? record.mosque : {};
  const publishedAt = record.published_at || record.date || "";

  return {
    id: record.id,
    category: "announcement",
    title: record.title,
    // [Urmee · F9] The editor's category (janazah, eid, …), pin flag and image. `category` above stays
    // "announcement" because the community feed uses it as the item type.
    // [Urmee · VIVA] Public page er jonno nitun field: kind (janazah/eid...), isPinned, imageUrl -- details page e pin/image/janazah styling er jonno.
    kind: record.category || "general",
    isPinned: record.is_pinned === true,
    imageUrl: record.image_url || "",
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
    // The UI turns these into translated text (announcement.publishedBy.*).
    publishedBy: mosque.verified === true || mosque.verification_status === "verified"
      ? { kind: "verifiedAdmin" }
      : mosque.name
        ? { kind: "mosqueCommunity", name: mosque.name }
        : { kind: "community" },
  };
}
