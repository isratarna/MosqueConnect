/*
 * Journey planner ar "next jamat you can catch" er API call. Pure formatter
 * gula journeyFormat.js e, jate node --test e API client import na lage.
 */
import { apiRequest } from "./api.js";

export * from "./journeyFormat.js";

export function fetchCatchable({ lat, lng, mode = "walk" }) {
  const query = new URLSearchParams({ lat: String(lat), lng: String(lng), mode });
  return apiRequest(`/api/mosques/catchable?${query}`, { headers: { Accept: "application/json" } });
}

export function planJourney(body) {
  return apiRequest("/api/journeys/plan", { method: "POST", body, headers: { Accept: "application/json" } });
}

export function fetchJourney(id) {
  return apiRequest(`/api/journeys/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
}
