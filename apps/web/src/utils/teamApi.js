import { apiRequest } from "./api";

const admin = (mosqueId) => `/api/admin/mosques/${mosqueId}`;

function query(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  return search.size ? `?${search}` : "";
}

// Mosque team (dashboard)
export function fetchTeam(mosqueId, options) {
  return apiRequest(`${admin(mosqueId)}/members`, options);
}

export function inviteMember(mosqueId, phone, role) {
  return apiRequest(`${admin(mosqueId)}/members`, { method: "POST", body: { phone, role } });
}

export function changeMemberRole(mosqueId, memberId, role) {
  return apiRequest(`${admin(mosqueId)}/members/${memberId}`, { method: "PATCH", body: { role } });
}

export function removeMember(mosqueId, memberId) {
  return apiRequest(`${admin(mosqueId)}/members/${memberId}`, { method: "DELETE" });
}

export function leaveMosque(mosqueId) {
  return apiRequest(`${admin(mosqueId)}/leave`, { method: "POST" });
}

// The signed-in user's invitations
export function fetchMyInvites(options) {
  return apiRequest("/api/me/mosque-invites", options).then((response) => response.data || []);
}

export function respondToInvite(inviteId, accept) {
  return apiRequest(`/api/me/mosque-invites/${inviteId}/${accept ? "accept" : "decline"}`, { method: "POST" });
}

// Suggested corrections
export function suggestCorrection(mosqueId, body) {
  return apiRequest(`/api/mosques/${mosqueId}/suggestions`, { method: "POST", body });
}

export function fetchMySuggestions(options) {
  return apiRequest("/api/me/suggestions", options);
}

export function fetchMosqueSuggestions(mosqueId, params = {}, options) {
  return apiRequest(`${admin(mosqueId)}/suggestions${query(params)}`, options);
}

export function reviewMosqueSuggestion(mosqueId, suggestionId, action, reviewNote) {
  return apiRequest(`${admin(mosqueId)}/suggestions/${suggestionId}/${action}`, { method: "PATCH", body: { review_note: reviewNote || null } });
}

export function fetchSystemSuggestions(params = {}, options) {
  return apiRequest(`/api/super-admin/suggestions${query(params)}`, options);
}

export function reviewSystemSuggestion(suggestionId, action, reviewNote) {
  return apiRequest(`/api/super-admin/suggestions/${suggestionId}/${action}`, { method: "PATCH", body: { review_note: reviewNote || null } });
}

// Super-admin team tools
export function fetchMosqueTeamAsSuperAdmin(mosqueId, options) {
  return apiRequest(`/api/super-admin/mosques/${mosqueId}/members`, options).then((response) => response.data || []);
}

export function transferOwnership(mosqueId, userId, previousOwners = "manager") {
  return apiRequest(`/api/super-admin/mosques/${mosqueId}/transfer`, { method: "POST", body: { user_id: userId, previous_owners: previousOwners } });
}

export function revokeMember(mosqueId, userId) {
  return apiRequest(`/api/super-admin/mosques/${mosqueId}/members/${userId}`, { method: "DELETE" });
}
