import assert from "node:assert/strict";
import test from "node:test";
import {
  decodePolyline,
  minutesBehind,
  pointToSegment,
  projectOnRoute,
  routePoints,
  shouldReplan,
} from "./routeGeometry.js";
import { buildMapsUrl, dueAlerts, formatMinutes, selectedStops } from "./journeyFormat.js";

test("decodes Google's documented sample polyline", () => {
  assert.deepEqual(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [
    { lat: 38.5, lng: -120.2 },
    { lat: 40.7, lng: -120.95 },
    { lat: 43.252, lng: -126.453 },
  ]);
});

test("point-to-segment distance matches the PHP maths", () => {
  const a = { lat: 23.7, lng: 90.4 };
  const b = { lat: 23.7, lng: 90.41 };

  const middle = pointToSegment({ lat: 23.701, lng: 90.405 }, a, b);
  assert.ok(Math.abs(middle.distance - 110.54) < 0.5);
  assert.ok(Math.abs(middle.t - 0.5) < 0.01);

  const beyond = pointToSegment({ lat: 23.7, lng: 90.42 }, a, b);
  assert.equal(beyond.t, 1);
});

test("projects a position onto the route with its planned eta", () => {
  // 0.02° purbe ~2.2 km, 200 s e.
  const points = routePoints([[0, 0, 0, 0], [0, 0.01, 1113, 100], [0, 0.02, 2226, 200]]);
  const projection = projectOnRoute(points, { lat: 0.002, lng: 0.015 });

  assert.ok(Math.abs(projection.offRouteM - 221) < 2);
  assert.ok(Math.abs(projection.alongM - 1670) < 5);
  assert.ok(Math.abs(projection.etaS - 150) < 1);
});

test("minutes behind compares real elapsed time with the plan", () => {
  const departAt = "2026-10-03T15:00:00+06:00";
  const projection = { etaS: 30 * 60 };
  assert.equal(minutesBehind(projection, departAt, new Date("2026-10-03T15:42:00+06:00")), 12);
  assert.equal(minutesBehind(projection, departAt, new Date("2026-10-03T15:25:00+06:00")), -5);
});

test("re-plans only when off route or behind, at most every 3 minutes", () => {
  const now = Date.parse("2026-10-03T16:00:00Z");
  assert.equal(shouldReplan({ offRouteM: 1500, behindMin: 0, lastReplanAt: null, now }), true);
  assert.equal(shouldReplan({ offRouteM: 50, behindMin: 11, lastReplanAt: null, now }), true);
  assert.equal(shouldReplan({ offRouteM: 50, behindMin: 4, lastReplanAt: null, now }), false);
  assert.equal(shouldReplan({ offRouteM: 1500, behindMin: 0, lastReplanAt: now - 60_000, now }), false);
  assert.equal(shouldReplan({ offRouteM: 1500, behindMin: 0, lastReplanAt: now - 200_000, now }), true);
});

test("maps url adds the chosen stops as waypoints in route order", () => {
  const prayers = [
    { prayer: "asr", status: "ok", window: { starts_at: "a" }, options: [
      { mosque: { id: 1, lat: 23.5, lng: 90.8 }, along_route_m: 50000 },
      { mosque: { id: 2, lat: 23.4, lng: 91.0 }, along_route_m: 70000 },
    ] },
    { prayer: "dhuhr", status: "ok", window: { starts_at: "b" }, options: [{ mosque: { id: 3, lat: 23.7, lng: 90.5 }, along_route_m: 10000 }] },
    { prayer: "maghrib", status: "none_reachable", window: { starts_at: "c" }, options: [{ mosque: { id: 4, lat: 0, lng: 0 } }] },
  ];

  const stops = selectedStops(prayers, { "asr@a": 2 });
  assert.deepEqual(stops.map((s) => s.mosque.id), [2, 3]);

  const url = buildMapsUrl({ origin: { lat: 23.72, lng: 90.41 }, destination: { lat: 23.46, lng: 91.18 }, stops });
  const params = new URL(url).searchParams;
  assert.equal(params.get("waypoints"), "23.7,90.5|23.4,91");
  assert.equal(params.get("travelmode"), "driving");
});

test("formats minutes and finds due alerts once", () => {
  assert.equal(formatMinutes(14), "14 min");
  assert.equal(formatMinutes(80), "1h 20m");

  const now = new Date("2026-10-03T16:00:00+06:00");
  const stop = { key: "asr@x", jamaat_at: "2026-10-03T16:18:00+06:00" };
  const sent = new Set();
  const due = dueAlerts([stop], now, sent);
  assert.deepEqual(due.map((d) => d.threshold), [20]);
  due.forEach((d) => sent.add(d.id));
  assert.equal(dueAlerts([stop], now, sent).length, 0);
});
