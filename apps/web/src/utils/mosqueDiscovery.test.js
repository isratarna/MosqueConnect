import assert from "node:assert/strict";
import test from "node:test";
import {
  coordinatesOf,
  DISCOVERY_RADIUS_KM,
  distanceKm,
  fetchMosqueById,
  fetchNearbyMosques,
  filterMosques,
  normalizeMosques,
} from "./mosqueDiscovery.js";

const ORIGIN = { lat: 23.78, lng: 90.4 };

test("coordinate validation accepts aliases and rejects missing or out-of-range values", () => {
  assert.deepEqual(coordinatesOf({ latitude: "23.78", longitude: "90.4" }), ORIGIN);
  assert.equal(coordinatesOf({ lat: "", lng: 90.4 }), null);
  assert.equal(coordinatesOf({ lat: null, lng: 90.4 }), null);
  assert.equal(coordinatesOf({ lat: 91, lng: 90.4 }), null);
  assert.equal(coordinatesOf({ lat: 23.78, lng: -181 }), null);
});

test("distance uses the same 6371 km haversine calculation as the API", () => {
  const oneDegreeAtEquator = distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(Math.abs(oneDegreeAtEquator - 111.195) < 0.001);
  assert.equal(distanceKm(ORIGIN, { lat: "invalid", lng: 90.4 }), null);
});

test("normalization drops invalid coordinates, enforces radius, and sorts nearest first", () => {
  const records = [
    { id: 3, name: "Outside", latitude: 23.8, longitude: 90.4, distance_km: DISCOVERY_RADIUS_KM + 0.001 },
    { id: 2, name: "Second", latitude: 23.79, longitude: 90.4, distance_km: 2 },
    { id: 4, name: "Invalid", latitude: null, longitude: 90.4, distance_km: 0 },
    { id: 1, name: "First", latitude: 23.781, longitude: 90.4, distance_km: 1 },
    { id: 5, name: "Boundary", latitude: 23.795, longitude: 90.4, distance_km: DISCOVERY_RADIUS_KM },
  ];

  assert.deepEqual(normalizeMosques(records, ORIGIN).map((mosque) => mosque.id), [1, 2, 5]);
});

test("browse filtering composes search, facilities, distance, location, and sorting", () => {
  const mosques = normalizeMosques([
    {
      id: 1,
      name: "Central Mosque",
      address: "Gulshan, Dhaka",
      latitude: 23.781,
      longitude: 90.4,
      distance_km: 1,
      facilities: ["parking", "wudu"],
      rating: 4.5,
    },
    {
      id: 2,
      name: "North Mosque",
      address: "Uttara, Dhaka",
      latitude: 23.79,
      longitude: 90.4,
      distance_km: 4,
      facilities: ["wudu"],
      rating: 4.9,
    },
  ], ORIGIN);

  assert.deepEqual(filterMosques(mosques, { search: "gulshan" }).map((mosque) => mosque.id), [1]);
  assert.deepEqual(filterMosques(mosques, { facilities: new Set(["parking"]) }).map((mosque) => mosque.id), [1]);
  assert.deepEqual(filterMosques(mosques, { maxDistance: 2 }).map((mosque) => mosque.id), [1]);
  assert.deepEqual(filterMosques(mosques, { district: "Dhaka", area: "Uttara" }).map((mosque) => mosque.id), [2]);
  assert.deepEqual(filterMosques(mosques, { sort: "rating" }).map((mosque) => mosque.id), [2, 1]);
});

test("API client sends the shared radius and normalizes the response", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      json: async () => ({
        data: [{ id: 9, name: "Live Mosque", latitude: ORIGIN.lat, longitude: ORIGIN.lng, distance_km: 0 }],
      }),
    };
  };

  try {
    const mosques = await fetchNearbyMosques({
      latitude: ORIGIN.lat,
      longitude: ORIGIN.lng,
      radius: DISCOVERY_RADIUS_KM,
    });
    const url = new URL(requestedUrl);
    assert.equal(url.searchParams.get("radius"), String(DISCOVERY_RADIUS_KM));
    assert.deepEqual(mosques.map((mosque) => mosque.id), [9]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("profile fetch keeps API ids and works without a distance origin", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      json: async () => ({
        data: {
          id: 42,
          name: "API Mosque",
          address: "Dhaka",
          latitude: ORIGIN.lat,
          longitude: ORIGIN.lng,
          phone: "01700000000",
          description: "Live profile",
          verification_status: "verified",
        },
      }),
    };
  };

  try {
    const mosque = await fetchMosqueById(42);
    assert.match(requestedUrl, /\/api\/mosques\/42$/);
    assert.equal(mosque.id, 42);
    assert.equal(mosque.name, "API Mosque");
    assert.equal(mosque.lat, ORIGIN.lat);
    assert.equal(mosque.lng, ORIGIN.lng);
    assert.equal(mosque.verified, true);
    assert.equal(mosque.distance, null);
    assert.deepEqual(mosque.announcements, []);
    assert.deepEqual(mosque.facilities, []);
    assert.deepEqual(mosque.jumuah_sessions, []);
    assert.deepEqual(mosque.prayer_schedule, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("profile fetch surfaces missing mosques", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    json: async () => ({ message: "No query results for model [App\\Models\\Mosque] 999" }),
  });

  try {
    await assert.rejects(() => fetchMosqueById(999), /Mosque not found|No query results/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
