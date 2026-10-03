/*
 * Route geometry for live mode. Backend-er app/Services/Journey/RouteGeometry.php
 * ar Polyline.php er same maths, jate browser nijei progress ber korte pare —
 * proti GPS update-e server call lage na.
 */

const METRES_PER_DEG_LAT = 110540;
const METRES_PER_DEG_LNG = 111320;
const EARTH_RADIUS_M = 6371000;

// Re-plan er niyom: route theke 1 km er beshi dure, ba 10 min er beshi pichone,
// ar dui re-plan er moddhe kompokkhe 3 min.
export const REPLAN_OFF_ROUTE_M = 1000;
export const REPLAN_BEHIND_MIN = 10;
export const REPLAN_MIN_INTERVAL_MS = 3 * 60 * 1000;

// Google encoded polyline (precision 5) theke [{lat, lng}] list.
export function decodePolyline(encoded, precision = 5) {
  const factor = 10 ** precision;
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    // Prottek point-e duita delta: age lat, tarpor lng.
    for (const axis of ["lat", "lng"]) {
      let result = 0;
      let shift = 0;
      let byte;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);

      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === "lat") lat += delta;
      else lng += delta;
    }

    points.push({ lat: Number((lat / factor).toFixed(precision)), lng: Number((lng / factor).toFixed(precision)) });
  }

  return points;
}

export function distanceM(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Point P theke segment AB er durotto (metre) ar t (0..1). Local flat metre-e
// project: x = Δlng · cos(lat0) · 111320, y = Δlat · 110540.
export function pointToSegment(p, a, b) {
  const cosLat0 = Math.cos((a.lat * Math.PI) / 180);
  const toXY = (point) => [
    (point.lng - a.lng) * cosLat0 * METRES_PER_DEG_LNG,
    (point.lat - a.lat) * METRES_PER_DEG_LAT,
  ];

  const [px, py] = toXY(p);
  const [bx, by] = toXY(b);
  const lengthSquared = bx * bx + by * by;
  const t = lengthSquared > 0 ? Math.max(0, Math.min(1, (px * bx + py * by) / lengthSquared)) : 0;

  return { distance: Math.hypot(px - t * bx, py - t * by), t };
}

// API-r route.points ([lat, lng, cum_distance_m, eta_s]) ke object e.
export function routePoints(raw = []) {
  return raw.map(([lat, lng, cum, eta]) => ({ lat, lng, cum, eta }));
}

// Ekhonkar position route-er kothay: route theke koto dure, shuru theke koto
// metre, ar plan onujayi oi jaygay kokhon thakar kotha chilo (eta_s).
export function projectOnRoute(points, position) {
  if (!points.length) return null;
  if (points.length === 1) {
    return { offRouteM: distanceM(position, points[0]), alongM: points[0].cum, etaS: points[0].eta };
  }

  let best = null;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const { distance, t } = pointToSegment(position, a, b);
    if (!best || distance < best.offRouteM) {
      best = {
        offRouteM: distance,
        alongM: a.cum + t * (b.cum - a.cum),
        etaS: a.eta + t * (b.eta - a.eta),
        index: i,
      };
    }
  }
  return best;
}

// Plan-er cheye koto minute pichone (negative hole age).
export function minutesBehind(projection, departAt, now = new Date()) {
  if (!projection) return 0;
  const elapsedS = (now.getTime() - new Date(departAt).getTime()) / 1000;
  return (elapsedS - projection.etaS) / 60;
}

// Re-plan korbo kina: route chhere gele ba onek pichone porle, kintu 3 min por por.
export function shouldReplan({ offRouteM, behindMin, lastReplanAt, now = Date.now() }) {
  if (lastReplanAt && now - lastReplanAt < REPLAN_MIN_INTERVAL_MS) return false;
  return offRouteM > REPLAN_OFF_ROUTE_M || behindMin > REPLAN_BEHIND_MIN;
}
