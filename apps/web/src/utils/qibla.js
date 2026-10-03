// Qibla = the great-circle bearing from the user to the Kaaba in Makkah.
const KAABA = { lat: 21.422487, lng: 39.826206 };
const toRadians = (degrees) => (degrees * Math.PI) / 180;
const toDegrees = (radians) => (radians * 180) / Math.PI;

/** Initial bearing in degrees clockwise from true north (0–360). */
// [Urmee · F2 Part 3] Great-circle initial bearing from the user to the Kaaba, degrees clockwise from
// true north.
export function qiblaBearing(lat, lng) {
  const phi1 = toRadians(lat);
  const phi2 = toRadians(KAABA.lat);
  const deltaLambda = toRadians(KAABA.lng - lng);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

const POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const compassPoint = (degrees) => POINTS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];

/** Device compass heading (degrees from north) from a deviceorientation event, or null. */
// [Urmee · F2 Part 3] iOS gives webkitCompassHeading; Android gives an absolute alpha
// (counter-clockwise, hence 360 - alpha). Anything else is not a compass reading.
export function headingFromEvent(event) {
  if (typeof event.webkitCompassHeading === "number") return event.webkitCompassHeading; // iOS
  if (event.absolute && typeof event.alpha === "number") return (360 - event.alpha) % 360; // Android absolute
  return null;
}
