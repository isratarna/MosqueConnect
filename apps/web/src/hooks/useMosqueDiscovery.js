import { useCallback, useEffect, useState } from "react";
import {
  clearMosqueDiscoveryCache,
  coordinatesOf,
  DISCOVERY_RADIUS_KM,
  fetchNearbyMosques,
} from "../utils/mosqueDiscovery.js";

export function useMosqueDiscovery(origin, radius = DISCOVERY_RADIUS_KM) {
  const [mosques, setMosques] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const coordinates = coordinatesOf(origin);
  const latitude = coordinates?.lat;
  const longitude = coordinates?.lng;

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) {
      setMosques([]);
      setStatus("error");
      setError("A valid location is required to discover mosques.");
      return undefined;
    }

    let active = true;
    setStatus("loading");
    setError("");

    fetchNearbyMosques({ latitude, longitude, radius })
      .then((results) => {
        if (!active) return;
        setMosques(results);
        setStatus("success");
      })
      .catch((requestError) => {
        if (!active) return;
        setMosques([]);
        setStatus("error");
        setError(requestError.message || "Nearby mosques could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [latitude, longitude, radius, attempt]);

  const retry = useCallback(() => {
    clearMosqueDiscoveryCache(latitude, longitude, radius);
    setAttempt((current) => current + 1);
  }, [latitude, longitude, radius]);

  return { mosques, status, error, retry, radius };
}
