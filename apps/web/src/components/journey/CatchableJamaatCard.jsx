import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Car, Clock3, Footprints, LoaderCircle, LocateFixed, Navigation, Route } from "lucide-react";
import { hasLocation as originHasLocation, requestGeolocation } from "../../hooks/useGeolocation";
import { useNow } from "../../hooks/useNow";
import { fetchCatchable, minutesUntil } from "../../utils/journeyApi";
import { formatMinutesT, formatTimeT, prayerNameT } from "../../utils/journeyFormat";
import { useLocale } from "../../hooks/useLocale";
import { directionsUrl } from "../../utils/mosqueDiscovery";
import EstimatedBadge from "../EstimatedBadge";
import { BlockStack, SkeletonRegion } from "../skeletons";

/*
 * Home card: "Next jamat you can catch". Location theke kacher mosque gulor
 * porer jamaat, hete/gari-te pouchano jay kina, proti minute e refresh hoy.
 */
export default function CatchableJamaatCard({ origin }) {
  const { t } = useLocale();
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
            <Clock3 size={18} aria-hidden="true" /> {t("journey.catch.title")}
          </h2>
          <div className="btn-group btn-group-sm" role="group" aria-label={t("journey.catch.travelMode")}>
            <button type="button" className={`btn ${mode === "walk" ? "btn-mc" : "btn-outline-mc"}`} onClick={() => setMode("walk")} aria-pressed={mode === "walk"}>
              <Footprints size={14} aria-hidden="true" /> {t("journey.catch.walk")}
            </button>
            <button type="button" className={`btn ${mode === "drive" ? "btn-mc" : "btn-outline-mc"}`} onClick={() => setMode("drive")} aria-pressed={mode === "drive"}>
              <Car size={14} aria-hidden="true" /> {t("journey.catch.drive")}
            </button>
          </div>
        </div>

        {!hasLocation && (
          <div>
            <p className="small text-muted mb-2">{t("journey.catch.share")}</p>
            <button type="button" className="btn btn-mc btn-sm" onClick={() => requestGeolocation({ force: true })} disabled={origin.loading}>
              {origin.loading ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : <LocateFixed size={14} aria-hidden="true" />} {t("journey.catch.useLocation")}
            </button>
            {origin.status === "failure" && <p className="small text-danger mt-2 mb-0">{origin.message}</p>}
          </div>
        )}

        {hasLocation && state.status === "loading" && (
          <SkeletonRegion label={t("journey.catch.checking")}><BlockStack heights={[48, 48]} /></SkeletonRegion>
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
              : t("journey.catch.nobody")}
          </p>
        )}
      </div>
    </div>
  );
}

function CatchableOption({ option, now, mode, primary = false }) {
  const { t, locale } = useLocale();
  const startsIn = minutesUntil(option.jamaat_at, now);
  const url = directionsUrl(option.mosque);
  const travel = t(mode === "walk" ? "journey.catch.travelWalk" : "journey.catch.travelDrive", { time: formatMinutesT(t, option.travel_min) });

  return (
    <div className="d-flex align-items-start justify-content-between gap-2">
      <div>
        <div className={primary ? "fw-semibold" : ""}>
          {t("journey.catch.at", { prayer: prayerNameT(t, option.label, option.prayer) })} <Link to={`/mosque/${option.mosque.id}`}>{option.mosque.name}</Link>
          {option.estimated && <> <EstimatedBadge /></>}
        </div>
        <div className="small text-muted">
          {travel}, {startsIn >= 1 ? t("journey.catch.startsIn", { time: formatMinutesT(t, startsIn) }) : t("journey.catch.startsNow")} ({formatTimeT(option.jamaat_at, locale)})
        </div>
      </div>
      {url && (
        <a className={`btn btn-sm ${primary ? "btn-mc" : "btn-outline-mc"} flex-shrink-0`} href={url} target="_blank" rel="noreferrer">
          <Navigation size={14} aria-hidden="true" /> {t("journey.catch.directions")}
        </a>
      )}
    </div>
  );
}

export function JourneyEntryCard() {
  const { t } = useLocale();
  return (
    <div className="mc-journey-card mc-journey-card--entry card h-100">
      <div className="card-body d-flex flex-column">
        <h2 className="h6 d-flex align-items-center gap-2">
          <Route size={18} aria-hidden="true" /> {t("journey.entry.title")}
        </h2>
        <p className="small text-muted flex-grow-1">
          {t("journey.entry.copy")}
        </p>
        <Link to="/journey" className="btn btn-outline-mc btn-sm align-self-start">{t("journey.entry.cta")}</Link>
      </div>
    </div>
  );
}
