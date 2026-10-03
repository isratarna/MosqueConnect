import { useEffect, useMemo, useState } from "react";
import { LocateFixed, Navigation } from "lucide-react";
import { hasLocation, requestGeolocation, useGeolocation } from "../hooks/useGeolocation";
import { compassPoint, headingFromEvent, qiblaBearing } from "../utils/qibla";
import { useLocale } from "../hooks/useLocale";
import { formatNumber } from "../utils/intl";

/**
 * Qibla compass. The bearing to the Kaaba is calculated from the user's location. With a
 * compass sensor the dial turns with the phone; without one (desktop) it shows the fixed
 * bearing from north. iOS only gives sensor access after a tap, hence "Turn on compass".
 */
export default function Qibla() {
  const { t, locale } = useLocale(); // [Urmee · i18n shared] text from the locale files; degrees use the active language's digits
  const origin = useGeolocation();
  const located = hasLocation(origin);
  const bearing = useMemo(() => (located ? qiblaBearing(origin.lat, origin.lng) : null), [located, origin.lat, origin.lng]);
  const [heading, setHeading] = useState(null);
  const [sensor, setSensor] = useState("idle"); // idle | on | denied | unavailable

  useEffect(() => { document.title = t("qibla.pageTitle"); }, [t]);

  useEffect(() => {
    if (sensor !== "on") return undefined;
    const onOrientation = (event) => {
      const next = headingFromEvent(event);
      if (next !== null) setHeading(next);
    };
    // Android reports an absolute heading on its own event; iOS on the plain one.
    window.addEventListener("deviceorientationabsolute", onOrientation, true);
    window.addEventListener("deviceorientation", onOrientation, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrientation, true);
      window.removeEventListener("deviceorientation", onOrientation, true);
    };
  }, [sensor]);

  // [Urmee · F2 Part 3] iOS only allows motion sensors after a user tap (requestPermission), so the
  // compass starts from a button.
  const enableCompass = async () => {
    if (typeof window.DeviceOrientationEvent === "undefined") {
      setSensor("unavailable");
      return;
    }
    try {
      if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
        const result = await window.DeviceOrientationEvent.requestPermission();
        if (result !== "granted") {
          setSensor("denied");
          return;
        }
      }
      setSensor("on");
    } catch {
      setSensor("denied");
    }
  };

  // The dial rotates opposite to the phone so north stays north; the needle sits at the Qibla bearing.
  // [Urmee · F2 Part 3] The dial turns opposite to the phone so north stays north; the needle sits at
  // the Qibla bearing, so it points to the top mark when you face Qibla.
  const dialRotation = heading === null ? 0 : -heading;
  const facingQibla = heading !== null && bearing !== null && Math.abs(((bearing - heading + 540) % 360) - 180) < 5;

  return (
    <section className="mc-community-page mc-atmospheric-section">
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <header className="mc-community-page__intro text-center">
          <p className="mc-kicker">{t("qibla.kicker")}</p>
          <h1>{t("qibla.heading")}</h1>
          <p>{t("qibla.intro")}</p>
        </header>

        {!located ? (
          <div className="mc-card p-4 text-center">
            <p>{t("qibla.needLocation")}</p>
            <button type="button" className="btn btn-mc" onClick={() => requestGeolocation({ force: true })} disabled={origin.loading}>
              <LocateFixed size={16} aria-hidden="true" /> {origin.loading ? t("qibla.locating") : t("qibla.useLocation")}
            </button>
            {origin.status === "failure" && <p className="small text-danger mt-3 mb-0" role="alert">{origin.message} {t("qibla.setManually")}</p>}
          </div>
        ) : (
          <div className="mc-card p-4 text-center">
            <div className={`mc-qibla${facingQibla ? " is-aligned" : ""}`}>
              <svg viewBox="-110 -110 220 220" role="img" aria-label={t("qibla.dialAria", { degrees: formatNumber(Math.round(bearing), locale), point: t(`qibla.points.${compassPoint(bearing)}`) })}>
                <g style={{ transform: `rotate(${dialRotation}deg)`, transformOrigin: "0 0", transition: "transform 0.2s linear" }}>
                  <circle r="100" className="mc-qibla__dial" />
                  {["N", "E", "S", "W"].map((label, index) => (
                    <text key={label} className="mc-qibla__cardinal" x={Math.sin((index * Math.PI) / 2) * 82} y={-Math.cos((index * Math.PI) / 2) * 82 + 5} textAnchor="middle">{label}</text>
                  ))}
                  <g style={{ transform: `rotate(${bearing}deg)` }}>
                    <path d="M0 -92 L9 -20 L0 -30 L-9 -20 Z" className="mc-qibla__needle" />
                    <text y="-97" textAnchor="middle" className="mc-qibla__kaaba">🕋</text>
                  </g>
                </g>
                <circle r="5" className="mc-qibla__hub" />
                <path d="M0 -112 L5 -104 L-5 -104 Z" className="mc-qibla__marker" />
              </svg>
            </div>

            <p className="h4 mb-1">{formatNumber(Math.round(bearing), locale)}° {t(`qibla.points.${compassPoint(bearing)}`)}</p>
            <p className="text-muted small mb-3">{t("qibla.fromNorth")}{origin.status === "manual" && origin.areaName ? t("qibla.fromArea", { area: origin.areaName }) : ""}</p>

            {heading !== null ? (
              <p className={facingQibla ? "text-success fw-semibold" : "text-muted"} role="status">
                {facingQibla ? t("qibla.facing") : t("qibla.turn")}
              </p>
            ) : sensor === "on" ? (
              <p className="text-muted small" role="status">{t("qibla.waiting")}</p>
            ) : (
              <>
                <button type="button" className="btn btn-outline-mc btn-sm" onClick={enableCompass}>
                  <Navigation size={14} aria-hidden="true" /> {t("qibla.turnOn")}
                </button>
                <p className="small text-muted mt-2 mb-0" role={sensor === "idle" ? undefined : "status"}>
                  {sensor === "denied" && t("qibla.denied")}
                  {sensor === "unavailable" && t("qibla.unavailable")}
                  {sensor === "idle" && t("qibla.idleHint")}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
