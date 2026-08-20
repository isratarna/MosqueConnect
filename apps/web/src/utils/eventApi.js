import { apiUrl } from "../config";

export async function fetchPublishedEvents({ signal } = {}) {
  const response = await fetch(apiUrl("/api/events"), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.message
      || (payload.errors && Object.values(payload.errors).flat().join(" "))
      || "Published events could not be loaded.";

    throw new Error(message);
  }

  return Array.isArray(payload.data) ? payload.data : [];
}
