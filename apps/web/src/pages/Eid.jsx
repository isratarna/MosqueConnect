import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle, MapPin, Moon, RefreshCw, TriangleAlert } from "lucide-react";
import MapView from "../components/MapView";
import EidJamaatCard, { formatEidDate } from "../components/eid/EidJamaatCard";
import { requestGeolocation, useGeolocation } from "../hooks/useGeolocation";
import { fetchEidSeason, fetchNearbyEidJamaats } from "../utils/eidApi";
import { formatClockTime } from "../utils/prayerTime";
import { PageSkeleton } from "../components/skeletons";

const RADIUS_OPTIONS = [5, 10, 20, 50];

export default function Eid() {
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
    name: `${formatClockTime(jamaat.jamaat_time)} · ${jamaat.mosque?.name || "Eid jamaat"}`,
    address: jamaat.location_name || jamaat.mosque?.address || "",
    latitude: jamaat.latitude,
    longitude: jamaat.longitude,
    distance: jamaat.distance_km !== undefined ? Number(jamaat.distance_km).toFixed(1) : undefined,
    profile_path: `/mosque/${jamaat.mosque_id}`,
  })), [jamaats]);

  if (season === undefined) {
    return <PageSkeleton label="Loading Eid jamaats…" />;
  }

  if (!season?.active) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: 560 }}>
        <Moon size={42} className="text-mc" aria-hidden="true" />
        <h1 className="h3 mt-3">Eid jamaat near me</h1>
        {seasonError ? (
          <p className="text-muted">{seasonError}</p>
        ) : season ? (
          <p className="text-muted">
            {season.label} {season.year} jamaat times will appear here from {formatEidDate(season.show_from)}.
          </p>
        ) : (
          <p className="text-muted">Eid jamaat times appear here about two weeks before each Eid.</p>
        )}
        <Link to="/browse" className="btn btn-mc mt-2">Browse mosques</Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-4">
        <p className="mc-kicker mb-1">{season.label} {season.year}</p>
        <h1 className="h3 fw-bold mb-1">Eid jamaat near me</h1>
        <p className="text-muted mb-0">
          Expected on {formatEidDate(season.expected_date)}, subject to the moon sighting. Times are published by each mosque.
        </p>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="eid-radius" className="small text-muted text-nowrap">Within</label>
          <select id="eid-radius" className="form-select form-select-sm" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            {RADIUS_OPTIONS.map((value) => <option key={value} value={value}>{value} km</option>)}
          </select>
        </div>
        <div className="form-check form-switch mb-0">
          <input className="form-check-input" type="checkbox" role="switch" id="eid-women" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} />
          <label className="form-check-label" htmlFor="eid-women">Women's arrangement only</label>
        </div>
        {origin.status === "failure" && (
          <span className="small text-muted">
            <MapPin size={14} className="me-1" aria-hidden="true" />
            Showing Dhaka because your location is unavailable.
            <button type="button" className="btn btn-link btn-sm p-0 ms-1 align-baseline" onClick={() => requestGeolocation({ force: true })}>Try again</button>
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
              {locating ? "Finding your location…" : "Finding Eid jamaats near you…"}
            </p>
          )}
          {status === "error" && (
            <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
              <TriangleAlert size={18} aria-hidden="true" />
              <span className="flex-grow-1">{error}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRetryKey((n) => n + 1)}>
                <RefreshCw size={14} aria-hidden="true" /> Retry
              </button>
            </div>
          )}
          {status === "success" && jamaats.length === 0 && (
            <div className="text-center text-muted py-5">
              <Moon size={32} className="text-mc mb-2" aria-hidden="true" />
              <p className="mb-1">No Eid jamaats published within {radius} km yet.</p>
              <p className="small mb-0">Try a wider distance, or check back closer to Eid.</p>
            </div>
          )}
          {status === "success" && jamaats.length > 0 && (
            <div className="d-grid gap-3" aria-label="Nearby Eid jamaats">
              <p className="small text-muted mb-0">{jamaats.length} jamaat{jamaats.length === 1 ? "" : "s"}, earliest first.</p>
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
