/*
 * useGeolocation — resolves the user's {lat,lng}, falling back to the Dhaka
 * default if permission is denied or geolocation is unavailable. Never throws.
 */
import { useEffect, useState } from "react";
import { DEFAULT_CENTER } from "../config";

// Event-based small location service so components can request location on demand
const EVENT = "mc:location:update";

function dispatch(detail) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
}

export function requestGeolocation() {
  // announce that we're requesting permission
  dispatch({ ...DEFAULT_CENTER, fallback: true, loading: true, status: "requesting" });

  if (!navigator.geolocation) {
    dispatch({ ...DEFAULT_CENTER, fallback: true, loading: false, status: "failure", message: "Geolocation not supported" });
    return;
  }

  // small timer to indicate locating state if permission prompt completes quickly
  let locatingTimer = setTimeout(() => {
    dispatch({ ...DEFAULT_CENTER, fallback: true, loading: true, status: "locating" });
  }, 700);

  navigator.geolocation.getCurrentPosition(
    (p) => {
      clearTimeout(locatingTimer);
      dispatch({ lat: p.coords.latitude, lng: p.coords.longitude, fallback: false, loading: false, status: "success" });
    },
    (err) => {
      clearTimeout(locatingTimer);
      const msg = err && err.message ? err.message : "Permission denied";
      dispatch({ ...DEFAULT_CENTER, fallback: true, loading: false, status: "failure", message: msg });
    },
    { timeout: 10000 }
  );
}

export function useGeolocation() {
  const [origin, setOrigin] = useState({ ...DEFAULT_CENTER, fallback: true, loading: false, status: "idle" });

  useEffect(() => {
    const handler = (e) => setOrigin((prev) => ({ ...prev, ...e.detail }));
    window.addEventListener(EVENT, handler);

    return () => window.removeEventListener(EVENT, handler);
  }, []);

  return origin;
}
