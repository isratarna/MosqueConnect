import { apiUrl } from "../config";
import { getAuthHeaders } from "./authApi";

export const EVENT_REGISTRATION_ENABLED = import.meta.env.VITE_EVENT_REGISTRATION_ENABLED === "true";

export class EventApiError extends Error {
  constructor(message, status, payload = {}) {
    super(message);
    this.name = "EventApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.message
      || (payload.errors && Object.values(payload.errors).flat().join(" "))
      || "The event request could not be completed.";

    throw new EventApiError(message, response.status, payload);
  }

  return payload;
}

export async function fetchEventCollection({
  signal,
  search,
  category,
  mosqueId,
  date,
  page = 1,
  perPage = 100,
} = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) params.set("category", category);
  if (mosqueId) params.set("mosque_id", mosqueId);
  if (date) params.set("date", date);
  params.set("page", page);
  params.set("per_page", perPage);

  const payload = await request(`/api/events?${params.toString()}`, {
    method: "GET",
    signal,
  });

  return {
    events: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta || null,
    links: payload.links || null,
  };
}

export async function fetchPublishedEvents(options = {}) {
  const { events } = await fetchEventCollection(options);
  return events;
}

export async function fetchEvent(id, { signal } = {}) {
  const payload = await request(`/api/events/${encodeURIComponent(id)}`, {
    method: "GET",
    signal,
  });

  return payload.data || null;
}

export async function registerForEvent(id) {
  const payload = await request(`/api/events/${encodeURIComponent(id)}/register`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return payload;
}

export async function unregisterFromEvent(id) {
  const payload = await request(`/api/events/${encodeURIComponent(id)}/register`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return payload;
}
