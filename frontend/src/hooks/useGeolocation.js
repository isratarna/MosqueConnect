/*
 * useGeolocation — resolves the user's {lat,lng}, falling back to the Dhaka
 * default if permission is denied or geolocation is unavailable. Never throws.
 */
import { useEffect, useState } from "react";
import { DEFAULT_CENTER } from "../config";

export function useGeolocation() {
  const [origin, setOrigin] = useState({ ...DEFAULT_CENTER, fallback: true, loading: true });

  useEffect(() => {
    if (!navigator.geolocation) {
      setOrigin({ ...DEFAULT_CENTER, fallback: true, loading: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setOrigin({ lat: p.coords.latitude, lng: p.coords.longitude, fallback: false, loading: false }),
      () => setOrigin({ ...DEFAULT_CENTER, fallback: true, loading: false }),
      { timeout: 8000 }
    );
  }, []);

  return origin;
}
