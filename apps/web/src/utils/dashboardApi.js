import { apiRequest } from "./api";

const base = (mosqueId) => `/api/admin/mosques/${mosqueId}`;

export function fetchDashboard(mosqueId, options) {
  return apiRequest(`${base(mosqueId)}/dashboard`, options).then((response) => response.data);
}

export function fetchInsights(mosqueId, range = "30d", options) {
  return apiRequest(`${base(mosqueId)}/insights?range=${encodeURIComponent(range)}`, options).then((response) => response.data);
}

export function fetchAdminAnnouncements(mosqueId, options) {
  return apiRequest(`${base(mosqueId)}/announcements`, options).then((response) => response.data);
}

export function createAnnouncement(mosqueId, body) {
  return apiRequest(`${base(mosqueId)}/announcements`, { method: "POST", body }).then((response) => response.data);
}

export function updateAnnouncement(mosqueId, id, body) {
  return apiRequest(`${base(mosqueId)}/announcements/${id}`, { method: "PATCH", body }).then((response) => response.data);
}

export function setAnnouncementPublished(mosqueId, id, published) {
  return apiRequest(`${base(mosqueId)}/announcements/${id}/${published ? "publish" : "unpublish"}`, { method: "PATCH" }).then((response) => response.data);
}

export function deleteAnnouncement(mosqueId, id) {
  return apiRequest(`${base(mosqueId)}/announcements/${id}`, { method: "DELETE" });
}

/** Confirm or reject a pending campaign donation. */
export function reviewPledge(mosqueId, pledge, action) {
  return apiRequest(`${base(mosqueId)}/campaigns/${pledge.campaign_id}/donations/${pledge.id}/${action}`, { method: "PATCH" });
}

export function fetchAdminPrayerSchedule(mosqueId, options) {
  return apiRequest(`${base(mosqueId)}/prayer-schedule`, options).then((response) => response.data);
}

export function savePrayerSchedule(mosqueId, body) {
  return apiRequest(`${base(mosqueId)}/prayer-schedule`, { method: "PUT", body }).then((response) => response.data);
}

export function updateMosqueProfile(mosqueId, body) {
  return apiRequest(base(mosqueId), { method: "PATCH", body }).then((response) => response.mosque);
}

export function uploadMosquePhoto(mosqueId, file) {
  const body = new FormData();
  body.append("photo", file);
  return apiRequest(`${base(mosqueId)}/photo`, { method: "POST", body, headers: { Accept: "application/json" } }).then((response) => response.mosque);
}

export function removeMosquePhoto(mosqueId) {
  return apiRequest(`${base(mosqueId)}/photo`, { method: "DELETE" }).then((response) => response.mosque);
}
