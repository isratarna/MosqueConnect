import { apiUrl } from "../config";
import { getAuthHeaders } from "./authApi";
import { normalizeNotification } from "./notificationUtils";

export class NotificationApiError extends Error {
  constructor(message, status, payload = {}) {
    super(message);
    this.name = "NotificationApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.message
      || (payload.errors && Object.values(payload.errors).flat().join(" "))
      || "Notifications could not be loaded.";

    throw new NotificationApiError(message, response.status, payload);
  }

  return payload;
}

export async function fetchUnreadNotificationCount({ signal } = {}) {
  const payload = await request("/api/notifications/unread-count", {
    method: "GET",
    signal,
  });

  const count = Number(payload.count);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

export async function fetchNotifications({ page = 1, perPage = 15, signal } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const payload = await request(`/api/notifications?${params.toString()}`, {
    method: "GET",
    signal,
  });

  return {
    notifications: Array.isArray(payload.data) ? payload.data.map(normalizeNotification) : [],
    meta: payload.meta || null,
    links: payload.links || null,
  };
}

export async function markNotificationAsRead(id) {
  const payload = await request(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  });

  return normalizeNotification(payload.data || null);
}

export async function markAllNotificationsAsRead() {
  return request("/api/notifications/read-all", {
    method: "PATCH",
  });
}
