/*
 * useGeolocation — resolves the user's {lat,lng}, falling back to the Dhaka
 * default if permission is denied or geolocation is unavailable. Never throws.
 */
import { useEffect, useState } from "react";
import { DEFAULT_CENTER } from "../config";

// Event-based small location service so components can request location on demand
const EVENT = "mc:location:update";
let currentOrigin = { ...DEFAULT_CENTER, fallback: true, loading: false, status: "idle" };
let pendingRequest = null;

function dispatch(detail) {
  currentOrigin = { ...currentOrigin, ...detail };
  window.dispatchEvent(new CustomEvent(EVENT, { detail: currentOrigin }));
}

export function requestGeolocation({ force = false } = {}) {
  if (pendingRequest) return pendingRequest;
  if (!force && (currentOrigin.status === "success" || currentOrigin.status === "failure")) {
    return Promise.resolve(currentOrigin);
  }

  // announce that we're requesting permission
  dispatch({ ...DEFAULT_CENTER, fallback: true, loading: true, status: "requesting", message: null, errorCode: null });

  if (!navigator.geolocation) {
    dispatch({
      ...DEFAULT_CENTER,
      fallback: true,
      loading: false,
      status: "failure",
      message: "Location services are not supported by this browser.",
      errorCode: "unsupported",
    });
    return Promise.resolve(currentOrigin);
  }

  pendingRequest = new Promise((resolve) => {
    const locatingTimer = window.setTimeout(() => {
      dispatch({ ...DEFAULT_CENTER, fallback: true, loading: true, status: "locating" });
    }, 700);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(locatingTimer);
        dispatch({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          fallback: false,
          loading: false,
          status: "success",
          message: null,
          errorCode: null,
        });
        resolve(currentOrigin);
      },
      (error) => {
        window.clearTimeout(locatingTimer);
        const errorCode = error?.code === 1
          ? "denied"
          : error?.code === 2
            ? "unavailable"
            : error?.code === 3
              ? "timeout"
              : "unknown";
        const messages = {
          denied: "Location permission was denied.",
          unavailable: "Your current location is unavailable.",
          timeout: "Finding your location took too long.",
          unknown: "We could not determine your location.",
        };

        dispatch({
          ...DEFAULT_CENTER,
          fallback: true,
          loading: false,
          status: "failure",
          message: messages[errorCode],
          errorCode,
        });
        resolve(currentOrigin);
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }).finally(() => {
    pendingRequest = null;
  });

  return pendingRequest;
}

export function useGeolocation() {
  const [origin, setOrigin] = useState(currentOrigin);

  useEffect(() => {
    const handler = (e) => setOrigin((prev) => ({ ...prev, ...e.detail }));
    window.addEventListener(EVENT, handler);

    return () => window.removeEventListener(EVENT, handler);
  }, []);

  return origin;
}
