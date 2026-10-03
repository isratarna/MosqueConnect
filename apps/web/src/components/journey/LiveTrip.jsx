import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CirclePlay, CircleStop, LoaderCircle, ShieldAlert } from "lucide-react";
import { useNow } from "../../hooks/useNow";
import { dueAlerts, formatMinutes, formatTime, minutesUntil } from "../../utils/journeyApi";
import { minutesBehind, projectOnRoute, routePoints, shouldReplan } from "../../utils/routeGeometry";

/*
 * Live mode (shudhu page khola thakle). watchPosition diye position nei, browser-ei
 * route-e project kori (server call chara). Route theke 1 km dure ba 10 min pichone
 * gele, 3 min por por, onReplan ke ekhonkar jayga theke notun plan korte boli.
 */
export default function LiveTrip({ plan, stops, onReplan, onPosition, replanning }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [banners, setBanners] = useState([]);
  const watchId = useRef(null);
  const wakeLock = useRef(null);
  const lastReplanAt = useRef(null);
  const sentAlerts = useRef(new Set());
  const now = useNow(15_000);

  const points = useMemo(() => routePoints(plan.route.points), [plan.route.points]);

  // Screen on rakhi (jekhane support ache). Tab lukale lock chole jay, phire ele abar nei.
  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && document.visibilityState === "visible") {
        wakeLock.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      wakeLock.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    watchId.current = null;
    wakeLock.current?.release?.().catch(() => {});
    wakeLock.current = null;
    setActive(false);
    onPosition?.(null);
  }, [onPosition]);

  const handlePosition = useCallback((position) => {
    const here = { lat: position.coords.latitude, lng: position.coords.longitude };
    const projection = projectOnRoute(points, here);
    const behind = minutesBehind(projection, plan.route.depart_at, new Date());
    setProgress({ projection, behind });
    onPosition?.(here);

    if (!replanning && shouldReplan({ offRouteM: projection.offRouteM, behindMin: behind, lastReplanAt: lastReplanAt.current })) {
      lastReplanAt.current = Date.now();
      onReplan(here);
    }
  }, [points, plan.route.depart_at, onReplan, onPosition, replanning]);

  const start = () => {
    if (!navigator.geolocation) {
      setError("This browser cannot share your location.");
      return;
    }

    setError(null);
    setActive(true);
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    requestWakeLock();
  };

  // Active thakle ekta-i watcher; notun plan (re-plan) ele handler bodlay tai abar shuru.
  useEffect(() => {
    if (!active) return undefined;
    const id = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => setError(err.code === 1 ? "Location permission was denied." : "Your location is unavailable right now."),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    watchId.current = id;
    return () => navigator.geolocation.clearWatch(id);
  }, [handlePosition, active]);

  useEffect(() => {
    const onVisible = () => active && document.visibilityState === "visible" && requestWakeLock();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [active, requestWakeLock]);

  useEffect(() => () => {
    wakeLock.current?.release?.().catch(() => {});
  }, []);

  // Porer stop: je stop ekhono samne ar jamaat shuru hoyni.
  const alongM = progress?.projection?.alongM ?? 0;
  const upcoming = stops.filter((s) => (s.along_route_m ?? 0) >= alongM - 300 && minutesUntil(s.jamaat_at, now) > 0);
  const nextStop = upcoming[0];

  // 20 ar 5 min age alert: page-e banner, ar permission thakle notification.
  useEffect(() => {
    if (!active) return;
    for (const alert of dueAlerts(upcoming, now, sentAlerts.current)) {
      sentAlerts.current.add(alert.id);
      const text = `${alert.stop.label} jamaat at ${alert.stop.mosque.name} in ${formatMinutes(alert.left)}`;
      setBanners((current) => [...current.slice(-2), { id: alert.id, text }]);
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("MosqueConnect", { body: text, tag: alert.id });
        } catch {
          // Kichu mobile browser page theke notification dey na; banner ta thake.
        }
      }
    }
  }, [active, now, upcoming]);

  return (
    <div className="mc-journey-live card">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h2 className="h6 mb-0">Live mode</h2>
          {active ? (
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={stop}>
              <CircleStop size={14} aria-hidden="true" /> Stop trip
            </button>
          ) : (
            <button type="button" className="btn btn-mc btn-sm" onClick={start}>
              <CirclePlay size={14} aria-hidden="true" /> Start trip
            </button>
          )}
        </div>

        <p className="small text-muted mt-2 mb-1">
          <ShieldAlert size={13} aria-hidden="true" /> For passengers — don't use while driving. Keep this page open: phones pause location tracking in the background.
        </p>

        {error && <p className="small text-danger mb-1">{error}</p>}
        {replanning && <p className="small mb-1"><LoaderCircle className="spin" size={13} aria-hidden="true" /> You left the route or fell behind — re-planning from here…</p>}

        {banners.map((banner) => (
          <div key={banner.id} className="alert alert-info py-2 small mb-1 d-flex align-items-center gap-2" role="alert">
            <BellRing size={14} aria-hidden="true" /> {banner.text}
          </div>
        ))}

        {active && progress && (
          <ul className="list-unstyled small mb-0 mt-2">
            <li>{(progress.projection.alongM / 1000).toFixed(1)} of {(plan.route.distance_m / 1000).toFixed(1)} km · {Math.round(progress.projection.offRouteM)} m from the route</li>
            <li>{progress.behind > 1 ? `${formatMinutes(progress.behind)} behind plan` : progress.behind < -1 ? `${formatMinutes(-progress.behind)} ahead of plan` : "On schedule"}</li>
            {nextStop ? (
              <li className="fw-semibold mt-1">
                Next stop: {nextStop.label} at {nextStop.mosque.name} — jamaat {formatTime(nextStop.jamaat_at)}, in {formatMinutes(minutesUntil(nextStop.jamaat_at, now))}
                {" "}({Math.max(0, ((nextStop.along_route_m ?? 0) - progress.projection.alongM) / 1000).toFixed(1)} km ahead)
              </li>
            ) : (
              <li className="mt-1">No more prayer stops on this trip.</li>
            )}
          </ul>
        )}
        {active && !progress && !error && <p className="small mb-0"><LoaderCircle className="spin" size={13} aria-hidden="true" /> Waiting for your location…</p>}
      </div>
    </div>
  );
}
