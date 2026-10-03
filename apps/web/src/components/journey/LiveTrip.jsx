import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CirclePlay, CircleStop, LoaderCircle, ShieldAlert } from "lucide-react";
import { useNow } from "../../hooks/useNow";
import { dueAlerts, minutesUntil } from "../../utils/journeyApi";
import { formatMinutesT, formatTimeT, prayerNameT } from "../../utils/journeyFormat";
import { useLocale } from "../../hooks/useLocale";
import { minutesBehind, projectOnRoute, routePoints, shouldReplan } from "../../utils/routeGeometry";

/*
 * Live mode (shudhu page khola thakle). watchPosition diye position nei, browser-ei
 * route-e project kori (server call chara). Route theke 1 km dure ba 10 min pichone
 * gele, 3 min por por, onReplan ke ekhonkar jayga theke notun plan korte boli.
 */
export default function LiveTrip({ plan, stops, onReplan, onPosition, replanning }) {
  const { t, locale } = useLocale();
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
      setError(t("journey.live.noGeolocation"));
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
      (err) => setError(err.code === 1 ? t("journey.live.denied") : t("journey.live.unavailable")),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    watchId.current = id;
    return () => navigator.geolocation.clearWatch(id);
  }, [handlePosition, active, t]);

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
      const text = t("journey.live.alert", { prayer: prayerNameT(t, alert.stop.label, alert.stop.prayer), mosque: alert.stop.mosque.name, time: formatMinutesT(t, alert.left) });
      setBanners((current) => [...current.slice(-2), { id: alert.id, text }]);
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("MosqueConnect", { body: text, tag: alert.id });
        } catch {
          // Kichu mobile browser page theke notification dey na; banner ta thake.
        }
      }
    }
  }, [active, now, upcoming, t]);

  return (
    <div className="mc-journey-live card">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h2 className="h6 mb-0">{t("journey.live.title")}</h2>
          {active ? (
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={stop}>
              <CircleStop size={14} aria-hidden="true" /> {t("journey.live.stop")}
            </button>
          ) : (
            <button type="button" className="btn btn-mc btn-sm" onClick={start}>
              <CirclePlay size={14} aria-hidden="true" /> {t("journey.live.start")}
            </button>
          )}
        </div>

        <p className="small text-muted mt-2 mb-1">
          <ShieldAlert size={13} aria-hidden="true" /> {t("journey.live.warning")}
        </p>

        {error && <p className="small text-danger mb-1">{error}</p>}
        {replanning && <p className="small mb-1"><LoaderCircle className="spin" size={13} aria-hidden="true" /> {t("journey.live.replanning")}</p>}

        {banners.map((banner) => (
          <div key={banner.id} className="alert alert-info py-2 small mb-1 d-flex align-items-center gap-2" role="alert">
            <BellRing size={14} aria-hidden="true" /> {banner.text}
          </div>
        ))}

        {active && progress && (
          <ul className="list-unstyled small mb-0 mt-2">
            <li>{t("journey.live.progress", { done: (progress.projection.alongM / 1000).toFixed(1), total: (plan.route.distance_m / 1000).toFixed(1), off: Math.round(progress.projection.offRouteM) })}</li>
            <li>{progress.behind > 1 ? t("journey.live.behind", { time: formatMinutesT(t, progress.behind) }) : progress.behind < -1 ? t("journey.live.ahead", { time: formatMinutesT(t, -progress.behind) }) : t("journey.live.onSchedule")}</li>
            {nextStop ? (
              <li className="fw-semibold mt-1">
                {t("journey.live.nextStop", { prayer: prayerNameT(t, nextStop.label, nextStop.prayer), mosque: nextStop.mosque.name, at: formatTimeT(nextStop.jamaat_at, locale), time: formatMinutesT(t, minutesUntil(nextStop.jamaat_at, now)), km: Math.max(0, ((nextStop.along_route_m ?? 0) - progress.projection.alongM) / 1000).toFixed(1) })}
              </li>
            ) : (
              <li className="mt-1">{t("journey.live.noMoreStops")}</li>
            )}
          </ul>
        )}
        {active && !progress && !error && <p className="small mb-0"><LoaderCircle className="spin" size={13} aria-hidden="true" /> {t("journey.live.waiting")}</p>}
      </div>
    </div>
  );
}
