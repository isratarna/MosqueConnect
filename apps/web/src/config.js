/*
 * MosqueConnect application configuration.
 *
 * The Google Maps API key is read from the Vite env var VITE_GOOGLE_MAPS_API_KEY.
 * Copy .env.example to .env and paste your key there to enable the maps.
 * Until then, every page still works — map areas show a friendly placeholder.
 */
export const GOOGLE_MAPS_API_KEY = import.meta.env?.VITE_DISABLE_GOOGLE_MAPS === "true"
  ? ""
  : import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || "";

export const API_BASE_URL = (import.meta.env?.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export function apiUrl(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

// Default map centre when the user denies / has no geolocation (Dhaka).
export const DEFAULT_CENTER = { lat: 23.7806, lng: 90.4074 };
export const DEFAULT_ZOOM = 13;
