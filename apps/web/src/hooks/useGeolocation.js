/*
 * useGeolocation — resolves the user's {lat,lng}, falling back to the Dhaka
 * default if permission is denied or geolocation is unavailable. Never throws.
 */
import { useEffect, useState } from "react";
import { DEFAULT_CENTER } from "../config";

// Event-based small location service so components can request location on demand
const EVENT = "mc:location:update";
const loadManualLocation = () => {
  try {
    const saved = localStorage.getItem("mc_manual_location");
    if (saved) return JSON.parse(saved);
  } catch (e) {
    // Ignore parse errors
  }
  return null;
};

const savedLoc = loadManualLocation();
let currentOrigin = savedLoc
  ? { lat: savedLoc.lat, lng: savedLoc.lng, areaName: savedLoc.areaName, fallback: false, loading: false, status: "manual" }
  : { ...DEFAULT_CENTER, fallback: true, loading: false, status: "idle" };

export function setManualLocation(lat, lng, areaName) {
  try {
    localStorage.setItem("mc_manual_location", JSON.stringify({ lat, lng, areaName }));
  } catch (e) {
    // Ignore storage errors
  }
  dispatch({
    lat,
    lng,
    areaName,
    fallback: false,
    loading: false,
    status: "manual",
    message: null,
    errorCode: null,
  });
}
let pendingRequest = null;

function dispatch(detail) {
  currentOrigin = { ...currentOrigin, ...detail };
  window.dispatchEvent(new CustomEvent(EVENT, { detail: currentOrigin }));
}

export function requestGeolocation({ force = false } = {}) {
  if (pendingRequest) return pendingRequest;
  // A manually chosen location is kept until the user explicitly asks for GPS (force).
  if (!force && ["success", "failure", "manual"].includes(currentOrigin.status)) {
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

/** True once we have usable coordinates (GPS or manually chosen). */
export const hasLocation = (origin) => origin.status === "success" || origin.status === "manual";

export function useGeolocation() {
  const [origin, setOrigin] = useState(currentOrigin);

  useEffect(() => {
    const handler = (e) => setOrigin((prev) => ({ ...prev, ...e.detail }));
    window.addEventListener(EVENT, handler);

    return () => window.removeEventListener(EVENT, handler);
  }, []);

  return origin;
}
