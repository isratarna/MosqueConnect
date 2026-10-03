import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Car, Clock3, Footprints, LoaderCircle, LocateFixed, Navigation, Route } from "lucide-react";
import { hasLocation as originHasLocation, requestGeolocation } from "../../hooks/useGeolocation";
import { useNow } from "../../hooks/useNow";
import { fetchCatchable, formatMinutes, formatTime, minutesUntil } from "../../utils/journeyApi";
import { directionsUrl } from "../../utils/mosqueDiscovery";
import EstimatedBadge from "../EstimatedBadge";
import { BlockStack, SkeletonRegion } from "../skeletons";

/*
 * Home card: "Next jamat you can catch". Location theke kacher mosque gulor
 * porer jamaat, hete/gari-te pouchano jay kina, proti minute e refresh hoy.
 */
export default function CatchableJamaatCard({ origin }) {
  const [mode, setMode] = useState("walk");
  const [state, setState] = useState({ status: "idle", data: [], next: null, error: null });
  const now = useNow(60_000);
  const hasLocation = originHasLocation(origin);

  // Location, mode ba minute bodlale abar API call (useNow proti minute e "now" bodlay).
  const minuteKey = Math.floor(now.getTime() / 60_000);
  useEffect(() => {
    if (!hasLocation) return undefined;
    let cancelled = false;
    setState((current) => ({ ...current, status: current.data.length || current.next ? "refreshing" : "loading" }));

    fetchCatchable({ lat: origin.lat, lng: origin.lng, mode })
      .then((payload) => {
        if (!cancelled) setState({ status: "success", data: payload.data || [], next: payload.next || null, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", data: [], next: null, error: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [hasLocation, origin.lat, origin.lng, mode, minuteKey]);

  const [best, ...alternatives] = state.data;

  return (
    <div className="mc-journey-card card h-100" aria-live="polite">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
          <h2 className="h6 mb-0 d-flex align-items-center gap-2">
            <Clock3 size={18} aria-hidden="true" /> Next jamat you can catch
          </h2>
          <div className="btn-group btn-group-sm" role="group" aria-label="Travel mode">
            <button type="button" className={`btn ${mode === "walk" ? "btn-mc" : "btn-outline-mc"}`} onClick={() => setMode("walk")} aria-pressed={mode === "walk"}>
              <Footprints size={14} aria-hidden="true" /> Walk
            </button>
            <button type="button" className={`btn ${mode === "drive" ? "btn-mc" : "btn-outline-mc"}`} onClick={() => setMode("drive")} aria-pressed={mode === "drive"}>
              <Car size={14} aria-hidden="true" /> Drive
            </button>
          </div>
        </div>

        {!hasLocation && (
          <div>
            <p className="small text-muted mb-2">Share your location to see which jamaat you can still reach in time.</p>
            <button type="button" className="btn btn-mc btn-sm" onClick={() => requestGeolocation({ force: true })} disabled={origin.loading}>
              {origin.loading ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : <LocateFixed size={14} aria-hidden="true" />} Use my location
            </button>
            {origin.status === "failure" && <p className="small text-danger mt-2 mb-0">{origin.message}</p>}
          </div>
        )}

        {hasLocation && state.status === "loading" && (
          <SkeletonRegion label="Checking nearby jamaats…"><BlockStack heights={[48, 48]} /></SkeletonRegion>
        )}

        {hasLocation && state.status === "error" && <p className="small text-danger mb-0">{state.error}</p>}

        {hasLocation && best && (
          <>
            <CatchableOption option={best} now={now} mode={mode} primary />
            {alternatives.length > 0 && (
              <ul className="list-unstyled mb-0 mt-2 small">
                {alternatives.map((option) => (
                  <li key={`${option.mosque.id}-${option.jamaat_at}`} className="border-top pt-2 mt-2">
                    <CatchableOption option={option} now={now} mode={mode} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {hasLocation && ["success", "refreshing"].includes(state.status) && !best && (
          <p className="small mb-0">
            {state.next
              ? <>{state.next.message} — {state.next.mosque.name}{state.next.estimated && <> <EstimatedBadge /></>}</>
              : "No mosques with jamaat times found nearby."}
          </p>
        )}
      </div>
    </div>
  );
}

function CatchableOption({ option, now, mode, primary = false }) {
  const startsIn = minutesUntil(option.jamaat_at, now);
  const url = directionsUrl(option.mosque);
  const travel = `${formatMinutes(option.travel_min)} ${mode === "walk" ? "walk" : "drive"}`;

  return (
    <div className="d-flex align-items-start justify-content-between gap-2">
      <div>
        <div className={primary ? "fw-semibold" : ""}>
          {option.label} at <Link to={`/mosque/${option.mosque.id}`}>{option.mosque.name}</Link>
          {option.estimated && <> <EstimatedBadge /></>}
        </div>
        <div className="small text-muted">
          {travel}, starts {startsIn >= 1 ? `in ${formatMinutes(startsIn)}` : "now"} ({formatTime(option.jamaat_at)})
        </div>
      </div>
      {url && (
        <a className={`btn btn-sm ${primary ? "btn-mc" : "btn-outline-mc"} flex-shrink-0`} href={url} target="_blank" rel="noreferrer">
          <Navigation size={14} aria-hidden="true" /> Directions
        </a>
      )}
    </div>
  );
}

export function JourneyEntryCard() {
  return (
    <div className="mc-journey-card mc-journey-card--entry card h-100">
      <div className="card-body d-flex flex-column">
        <h2 className="h6 d-flex align-items-center gap-2">
          <Route size={18} aria-hidden="true" /> Travelling? Plan your prayers on the way
        </h2>
        <p className="small text-muted flex-grow-1">
          Enter a trip such as Dhaka to Chattogram and see which prayers fall on the way, with mosques you can reach before the jamaat.
        </p>
        <Link to="/journey" className="btn btn-outline-mc btn-sm align-self-start">Plan a journey</Link>
      </div>
    </div>
  );
}
