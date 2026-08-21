import { apiUrl } from "../config.js";

export const DISCOVERY_RADIUS_KM = 20;
export const MAX_DISCOVERY_RADIUS_KM = 100;

const EARTH_RADIUS_KM = 6371;
const CACHE_TTL_MS = 60_000;
const requestCache = new Map();

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function coordinatesOf(value) {
  const lat = finiteNumber(value?.lat ?? value?.latitude);
  const lng = finiteNumber(value?.lng ?? value?.longitude);

  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

export function distanceKm(from, to) {
  const start = coordinatesOf(from);
  const end = coordinatesOf(to);
  if (!start || !end) return null;

  const fromLatitude = (start.lat * Math.PI) / 180;
  const toLatitude = (end.lat * Math.PI) / 180;
  const latitudeDelta = toLatitude - fromLatitude;
  const longitudeDelta = ((end.lng - start.lng) * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function locationParts(record) {
  const parts = String(record?.address || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    district: String(record?.district || parts.at(-1) || "").trim(),
    area: String(record?.area || (parts.length > 1 ? parts.at(-2) : parts[0]) || "").trim(),
  };
}

export function normalizeMosque(record, origin, options = {}) {
  const coordinates = coordinatesOf(record);
  if (!record || record.id === null || record.id === undefined || !coordinates) return null;

  const requireDistance = options.requireDistance !== false;
  const apiDistance = finiteNumber(record.distance_km ?? record.distance);
  const calculatedDistance = distanceKm(origin, coordinates);
  const distance = apiDistance !== null && apiDistance >= 0 ? apiDistance : calculatedDistance;
  if (distance === null && requireDistance) return null;

  const rating = finiteNumber(record.rating);
  const facilities = Array.isArray(record.facilities)
    ? record.facilities.filter((facility) => typeof facility === "string" && facility)
    : [];
  const announcements = Array.isArray(record.announcements) ? record.announcements : [];
  const jumuahSessions = Array.isArray(record.jumuah_sessions) ? record.jumuah_sessions : [];
  const prayerSchedule = Array.isArray(record.prayer_schedule) ? record.prayer_schedule : [];

  return {
    ...record,
    ...coordinates,
    ...locationParts(record),
    id: record.id,
    name: String(record.name || "Unnamed mosque"),
    address: String(record.address || "Address unavailable"),
    phone: record.phone ? String(record.phone) : "",
    description: record.description ? String(record.description) : "",
    distance: distance !== null ? Number(distance.toFixed(3)) : null,
    verified: record.verified === true || record.verification_status === "verified",
    photo: record.photo || record.photo_url || "/uiRef.jpeg",
    rating: rating !== null && rating >= 0 ? rating : null,
    facilities,
    announcements,
    jumuah_sessions: jumuahSessions,
    prayer_schedule: prayerSchedule,
    prayer: record.prayer && typeof record.prayer === "object" ? record.prayer : {},
  };
}

export function normalizeMosques(records, origin, radius = DISCOVERY_RADIUS_KM) {
  const safeRadius = finiteNumber(radius);
  if (!Array.isArray(records) || safeRadius === null || safeRadius <= 0) return [];

  return records
    .map((record) => normalizeMosque(record, origin))
    .filter((mosque) => mosque && mosque.distance <= safeRadius)
    .sort((first, second) => first.distance - second.distance || String(first.id).localeCompare(String(second.id), undefined, { numeric: true }));
}

export function filterMosques(mosques, filters = {}) {
  const query = String(filters.search || "").trim().toLocaleLowerCase();
  const facilities = filters.facilities instanceof Set
    ? [...filters.facilities]
    : Array.isArray(filters.facilities) ? filters.facilities : [];
  const maxDistance = finiteNumber(filters.maxDistance);

  return [...mosques]
    .filter((mosque) => {
      const searchable = [mosque.name, mosque.address, mosque.area, mosque.district]
        .join(" ")
        .toLocaleLowerCase();

      return (!query || searchable.includes(query))
        && facilities.every((facility) => mosque.facilities.includes(facility))
        && (maxDistance === null || mosque.distance <= maxDistance)
        && (!filters.district || mosque.district === filters.district)
        && (!filters.area || mosque.area === filters.area);
    })
    .sort((first, second) => {
      if (filters.sort === "name") return first.name.localeCompare(second.name) || first.distance - second.distance;
      if (filters.sort === "rating") {
        const firstRating = first.rating ?? Number.NEGATIVE_INFINITY;
        const secondRating = second.rating ?? Number.NEGATIVE_INFINITY;
        return secondRating - firstRating || first.distance - second.distance;
      }
      return first.distance - second.distance || String(first.id).localeCompare(String(second.id), undefined, { numeric: true });
    });
}

function validateDiscoveryRequest(latitude, longitude, radius) {
  const origin = coordinatesOf({ latitude, longitude });
  const safeRadius = finiteNumber(radius);
  if (!origin) throw new Error("A valid latitude and longitude are required.");
  if (safeRadius === null || safeRadius <= 0 || safeRadius > MAX_DISCOVERY_RADIUS_KM) {
    throw new Error(`Radius must be greater than 0 and at most ${MAX_DISCOVERY_RADIUS_KM} km.`);
  }
  return { origin, radius: safeRadius };
}

function cacheKey(origin, radius) {
  return `${origin.lat.toFixed(6)}:${origin.lng.toFixed(6)}:${radius.toFixed(3)}`;
}

export function clearMosqueDiscoveryCache(latitude, longitude, radius = DISCOVERY_RADIUS_KM) {
  try {
    const request = validateDiscoveryRequest(latitude, longitude, radius);
    requestCache.delete(cacheKey(request.origin, request.radius));
  } catch {
    // Invalid coordinates have no corresponding cached request.
  }
}

export function fetchNearbyMosques({ latitude, longitude, radius = DISCOVERY_RADIUS_KM }) {
  let validated;
  try {
    validated = validateDiscoveryRequest(latitude, longitude, radius);
  } catch (error) {
    return Promise.reject(error);
  }

  const key = cacheKey(validated.origin, validated.radius);
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) return cached.request;
  requestCache.delete(key);

  const query = new URLSearchParams({
    latitude: String(validated.origin.lat),
    longitude: String(validated.origin.lng),
    radius: String(validated.radius),
  });

  const request = fetch(apiUrl(`/api/mosques/nearby?${query}`), {
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Nearby mosques could not be loaded.");
      if (!Array.isArray(payload.data)) throw new Error("The nearby mosque response was not in the expected format.");
      return normalizeMosques(payload.data, validated.origin, validated.radius);
    })
    .catch((error) => {
      requestCache.delete(key);
      throw error;
    });

  requestCache.set(key, { request, createdAt: Date.now() });
  return request;
}

export function directionsUrl(mosque) {
  const coordinates = coordinatesOf(mosque);
  if (!coordinates) return null;
  const destination = `${coordinates.lat},${coordinates.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function fetchMosqueById(id) {
  const mosqueId = String(id ?? "").trim();
  if (!mosqueId) {
    return Promise.reject(new Error("A mosque id is required."));
  }

  return fetch(apiUrl(`/api/mosques/${encodeURIComponent(mosqueId)}`), {
    headers: { Accept: "application/json" },
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 404) {
      throw new Error(payload.message || "Mosque not found.");
    }
    if (!response.ok) {
      throw new Error(payload.message || "Mosque details could not be loaded.");
    }
    if (!payload.data || typeof payload.data !== "object") {
      throw new Error("The mosque response was not in the expected format.");
    }

    const mosque = normalizeMosque(payload.data, null, { requireDistance: false });
    if (!mosque) {
      throw new Error("This mosque is missing a valid location.");
    }
    return mosque;
  });
}
