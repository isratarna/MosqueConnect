import { apiUrl } from "../config";
import { getAuthHeaders } from "./authApi";

export class SystemAdminApiError extends Error {
  constructor(message, status, payload = {}) {
    super(message);
    this.name = "SystemAdminApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.message
      || (payload.errors && Object.values(payload.errors).flat().join(" "))
      || "The administration request could not be completed.";
    throw new SystemAdminApiError(message, response.status, payload);
  }

  return payload;
}

function queryPath(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return query.size ? `${path}?${query}` : path;
}

export function fetchSystemAdminOverview({ signal } = {}) {
  return request("/api/super-admin/overview", { signal });
}

export async function fetchSystemStatistics({ signal } = {}) {
  const payload = await request("/api/super-admin/statistics", { signal });
  return payload.data;
}

export function fetchClaims(params = {}, { signal } = {}) {
  return request(queryPath("/api/super-admin/claims", params), { signal });
}

export function reviewClaim(id, action, reviewNote = "") {
  return request(`/api/super-admin/claims/${id}/${action}`, {
    method: "PATCH",
    body: JSON.stringify({ review_note: reviewNote || null }),
  });
}

export async function downloadClaimDocument(id) {
  const response = await fetch(apiUrl(`/api/super-admin/claims/${id}/document`), {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new SystemAdminApiError(payload.message || "The proof document could not be downloaded.", response.status, payload);
  }
  const disposition = response.headers.get("content-disposition") || "";
  const filename = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)?.[1];
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename ? decodeURIComponent(filename) : `verification-proof-${id}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function fetchManagedUsers(params = {}, { signal } = {}) {
  return request(queryPath("/api/super-admin/users", params), { signal });
}

export function updateManagedUser(id, changes) {
  return request(`/api/super-admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function fetchManagedMosques(params = {}, { signal } = {}) {
  return request(queryPath("/api/super-admin/mosques", params), { signal });
}

export function updateMosqueVerification(id, verificationStatus, reviewNote = "") {
  return request(`/api/super-admin/mosques/${id}/verification`, {
    method: "PATCH",
    body: JSON.stringify({ verification_status: verificationStatus, review_note: reviewNote || null }),
  });
}

export function fetchModerationQueue(params, { signal } = {}) {
  return request(queryPath("/api/super-admin/moderation", params), { signal });
}

export function updateContentModeration(type, id, moderationStatus, moderationNote = "") {
  return request(`/api/super-admin/moderation/${type}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ moderation_status: moderationStatus, moderation_note: moderationNote || null }),
  });
}

export function fetchReports(params = {}, { signal } = {}) {
  return request(queryPath("/api/super-admin/reports", params), { signal });
}

export function updateReport(id, status, resolutionNote = "") {
  return request(`/api/super-admin/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, resolution_note: resolutionNote || null }),
  });
}

export function fetchAuditLogs(params = {}, { signal } = {}) {
  return request(queryPath("/api/super-admin/audit-logs", params), { signal });
}

export async function fetchSystemSettings({ signal } = {}) {
  const payload = await request("/api/super-admin/settings", { signal });
  return payload.data;
}

export async function updateSystemSettings(settings) {
  const payload = await request("/api/super-admin/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
  return payload.data;
}
