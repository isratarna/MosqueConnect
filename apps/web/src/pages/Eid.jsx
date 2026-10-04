import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, MapPin, Moon, RefreshCw, TriangleAlert } from "lucide-react";
import MapView from "../components/MapView";
import EidJamaatCard, { formatEidDate } from "../components/eid/EidJamaatCard";
import { requestGeolocation, useGeolocation } from "../hooks/useGeolocation";
import { eidNameT, fetchEidSeason, fetchNearbyEidJamaats } from "../utils/eidApi";
import { useLocale } from "../hooks/useLocale";
import { formatClockTime } from "../utils/prayerTime";
import { PageSkeleton } from "../components/skeletons";

const RADIUS_OPTIONS = [5, 10, 20, 50];

export default function Eid() {
  const { t, locale } = useLocale(); // [Urmee · i18n dashboard]
  const origin = useGeolocation();
  const [season, setSeason] = useState(undefined);
  const [seasonError, setSeasonError] = useState("");
  const [radius, setRadius] = useState(10);
  const [womenOnly, setWomenOnly] = useState(false);
  const [jamaats, setJamaats] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchEidSeason({ refresh: true })
      .then((result) => { if (active) setSeason(result); })
      .catch((err) => { if (active) { setSeason(null); setSeasonError(err.message); } });
    requestGeolocation();
    return () => { active = false; };
  }, []);

  const locating = ["idle", "requesting", "locating"].includes(origin.status);

  useEffect(() => {
    if (!season?.active || locating) return undefined;
    const controller = new AbortController();
    setStatus("loading");
    setError("");

    fetchNearbyEidJamaats({ lat: origin.lat, lng: origin.lng, radius, women: womenOnly, signal: controller.signal })
      .then((result) => { setJamaats(result.jamaats); setStatus("success"); })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setStatus("error");
      });

    return () => controller.abort();
  }, [season?.active, locating, origin.lat, origin.lng, radius, womenOnly, retryKey]);

  const markers = useMemo(() => jamaats.map((jamaat) => ({
    id: jamaat.id,
    name: `${formatClockTime(jamaat.jamaat_time, locale)} · ${jamaat.mosque?.name || t("eid.shareTitle")}`,
    address: jamaat.location_name || jamaat.mosque?.address || "",
    latitude: jamaat.latitude,
    longitude: jamaat.longitude,
    distance: jamaat.distance_km !== undefined ? Number(jamaat.distance_km).toFixed(1) : undefined,
    profile_path: `/mosque/${jamaat.mosque_id}`,
  })), [jamaats, locale, t]);

  if (season === undefined) {
    return <PageSkeleton label={t("eid.page.loading")} />;
  }

  if (!season?.active) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: 560 }}>
        <Moon size={42} className="text-mc" aria-hidden="true" />
        <h1 className="h3 mt-3">{t("eid.page.title")}</h1>
        {seasonError ? (
          <p className="text-muted">{seasonError}</p>
        ) : season ? (
          <p className="text-muted">
            {t("eid.page.willAppear", { label: eidNameT(t, season.eid, season.label), year: season.year, date: formatEidDate(season.show_from, locale) })}
          </p>
        ) : (
          <p className="text-muted">{t("eid.page.appearLater")}</p>
        )}
        <Link to="/browse" className="btn btn-mc mt-2">{t("eid.page.browse")}</Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <p className="mc-kicker mb-1">{eidNameT(t, season.eid, season.label)} {season.year}</p>
        <h1 className="h3 fw-bold mb-1">{t("eid.page.title")}</h1>
        <p className="text-muted mb-0">
          {t("eid.page.expected", { date: formatEidDate(season.expected_date, locale) })}
        </p>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="eid-radius" className="small text-muted text-nowrap">{t("eid.page.within")}</label>
          <select id="eid-radius" className="form-select form-select-sm" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            {RADIUS_OPTIONS.map((value) => <option key={value} value={value}>{t("eid.page.km", { count: value })}</option>)}
          </select>
        </div>
        <div className="form-check form-switch mb-0">
          <input className="form-check-input" type="checkbox" role="switch" id="eid-women" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} />
          <label className="form-check-label" htmlFor="eid-women">{t("eid.page.womenOnly")}</label>
        </div>
        {origin.status === "failure" && (
          <span className="small text-muted">
            <MapPin size={14} className="me-1" aria-hidden="true" />
            {t("eid.page.showingDhaka")}
            <button type="button" className="btn btn-link btn-sm p-0 ms-1 align-baseline" onClick={() => requestGeolocation({ force: true })}>{t("eid.page.tryAgain")}</button>
          </span>
        )}
      </div>

      <div className="row g-4">
        <div className="col-lg-6 order-lg-2">
          <MapView
            className="mc-map mc-eid-map"
            center={{ lat: origin.lat, lng: origin.lng }}
            zoom={13}
            mosques={markers}
            userPos={origin.status === "success" ? { lat: origin.lat, lng: origin.lng } : null}
            selectedMosqueId={selectedId}
            onMosqueSelect={setSelectedId}
          />
        </div>
        <div className="col-lg-6 order-lg-1">
          {(locating || status === "loading") && (
            <p className="text-muted" role="status">
              <LoaderCircle size={16} className="spin me-2" aria-hidden="true" />
              {locating ? t("eid.page.finding") : t("eid.page.findingJamaats")}
            </p>
          )}
          {status === "error" && (
            <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
              <TriangleAlert size={18} aria-hidden="true" />
              <span className="flex-grow-1">{error}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRetryKey((n) => n + 1)}>
                <RefreshCw size={14} aria-hidden="true" /> {t("common.retry")}
              </button>
            </div>
          )}
          {status === "success" && jamaats.length === 0 && (
            <div className="text-center text-muted py-5">
              <Moon size={32} className="text-mc mb-2" aria-hidden="true" />
              <p className="mb-1">{t("eid.page.noneWithin", { radius })}</p>
              <p className="small mb-0">{t("eid.page.tryWider")}</p>
            </div>
          )}
          {status === "success" && jamaats.length > 0 && (
            <div className="d-grid gap-3" aria-label={t("eid.page.nearbyLabel")}>
              <p className="small text-muted mb-0">{t("eid.page.count", { count: jamaats.length })}</p>
              {jamaats.map((jamaat) => (
                <EidJamaatCard
                  key={jamaat.id}
                  jamaat={jamaat}
                  showMosque
                  active={String(selectedId) === String(jamaat.id)}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
