import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, ExternalLink, LoaderCircle, Route as RouteIcon } from "lucide-react";
import PlaceInput from "../components/journey/PlaceInput";
import JourneyMap from "../components/journey/JourneyMap";
import PrayerTimelineList from "../components/journey/PrayerTimelineList";
import LiveTrip from "../components/journey/LiveTrip";
import { requestGeolocation } from "../hooks/useGeolocation";
import {
  FACILITY_OPTIONS,
  buildMapsUrl,
  fetchJourney,
  formatMinutes,
  formatTime,
  planJourney,
  selectedStops,
} from "../utils/journeyApi";
import { BlockStack, SkeletonRegion } from "../components/skeletons";

/*
 * /journey ar /journey/:id. Form -> POST /api/journeys/plan -> map + timeline.
 * Plan-er id URL e boshai, tai link ta share kora jay (cache expire holeo dekha jay).
 */
export default function Journey() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    origin: { current: true },
    destination: null,
    departAt: "",
    mode: "drive",
    corridorKm: 2,
    facilities: [],
    prayerDuration: 15,
  });
  const [plan, setPlan] = useState(null);
  const [selection, setSelection] = useState({});
  const [status, setStatus] = useState(id ? "loading" : "idle");
  const [error, setError] = useState(null);
  const [replanning, setReplanning] = useState(false);
  const [livePosition, setLivePosition] = useState(null);
  const [copied, setCopied] = useState(false);

  // Share link khulle (ba reload) plan ta server theke ani.
  useEffect(() => {
    if (!id || plan?.id === id) return;
    setStatus("loading");
    fetchJourney(id)
      .then((data) => {
        setPlan(data);
        setSelection({});
        setStatus("success");
      })
      .catch((err) => {
        setError(err.status === 404 ? "This journey plan was not found." : err.message);
        setStatus("error");
      });
  }, [id, plan?.id]);

  const stops = useMemo(() => selectedStops(plan?.prayers, selection), [plan, selection]);
  const mapsUrl = plan ? buildMapsUrl({ origin: plan.origin, destination: plan.destination, stops, mode: plan.mode }) : null;

  const submit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!form.destination) {
      setError("Choose where you are going.");
      return;
    }

    let origin = form.origin;
    if (origin?.current) {
      const here = await requestGeolocation({ force: true });
      if (here.status !== "success") {
        setError(here.message || "We could not find your location. Pick a starting point instead.");
        return;
      }
      origin = { lat: here.lat, lng: here.lng, label: "My location" };
    }

    if (!origin) {
      setError("Choose where you are starting from.");
      return;
    }

    await runPlan({
      origin,
      destination: form.destination,
      depart_at: form.departAt ? new Date(form.departAt).toISOString() : undefined,
      mode: form.mode,
      corridor_km: Number(form.corridorKm),
      facilities: form.facilities,
      prayer_duration_min: Number(form.prayerDuration),
    });
  };

  const runPlan = useCallback(async (body, { live = false } = {}) => {
    if (live) setReplanning(true);
    else setStatus("loading");

    try {
      const data = await planJourney(body);
      setPlan(data);
      setSelection({});
      setStatus("success");
      navigate(`/journey/${data.id}`, { replace: Boolean(id) });
    } catch (err) {
      setError(err.message);
      if (!live) setStatus("error");
    } finally {
      setReplanning(false);
    }
  }, [navigate, id]);

  // Live mode theke: ekhonkar jayga theke, ekhoni rowna, baki setting age-r motoi.
  const replanFrom = useCallback((here) => {
    if (!plan) return;
    const request = plan.request || {};
    runPlan({
      origin: { lat: here.lat, lng: here.lng, label: "Current position" },
      destination: plan.destination,
      mode: plan.mode,
      corridor_km: request.corridor_km,
      facilities: request.facilities || [],
      prayer_duration_min: request.prayer_duration_min,
    }, { live: true });
  }, [plan, runPlan]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const toggleFacility = (key) => setForm((current) => ({
    ...current,
    facilities: current.facilities.includes(key) ? current.facilities.filter((f) => f !== key) : [...current.facilities, key],
  }));

  return (
    <div className="container py-4 mc-journey-page">
      <h1 className="h4 d-flex align-items-center gap-2"><RouteIcon size={22} aria-hidden="true" /> Plan prayers on your journey</h1>
      <p className="text-muted small">
        See which prayers fall during your trip and which mosques along the route you can reach before the jamaat. We show times and options only.
      </p>

      <div className="row g-4">
        <div className="col-lg-4">
          <form className="card" onSubmit={submit}>
            <div className="card-body d-grid gap-3">
              <PlaceInput id="journey-origin" label="From" value={form.origin} allowCurrent onChange={(origin) => setForm((f) => ({ ...f, origin }))} />
              <PlaceInput id="journey-destination" label="To" value={form.destination} onChange={(destination) => setForm((f) => ({ ...f, destination }))} />

              <div className="row g-2">
                <div className="col-7">
                  <label className="form-label small fw-semibold" htmlFor="journey-depart">Leaving at</label>
                  <input id="journey-depart" type="datetime-local" className="form-control form-control-sm" value={form.departAt} onChange={(e) => setForm((f) => ({ ...f, departAt: e.target.value }))} />
                  <div className="form-text">Empty = now</div>
                </div>
                <div className="col-5">
                  <label className="form-label small fw-semibold" htmlFor="journey-mode">Mode</label>
                  <select id="journey-mode" className="form-select form-select-sm" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
                    <option value="drive">Car</option>
                    <option value="walk">Walk (short trips)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold" htmlFor="journey-corridor">Mosques within {form.corridorKm} km of the route</label>
                <input id="journey-corridor" type="range" className="form-range" min="0.5" max="5" step="0.5" value={form.corridorKm} onChange={(e) => setForm((f) => ({ ...f, corridorKm: e.target.value }))} />
              </div>

              <div>
                <label className="form-label small fw-semibold" htmlFor="journey-duration">Time per stop: {form.prayerDuration} min (with wudu)</label>
                <input id="journey-duration" type="range" className="form-range" min="10" max="30" step="5" value={form.prayerDuration} onChange={(e) => setForm((f) => ({ ...f, prayerDuration: e.target.value }))} />
              </div>

              <fieldset>
                <legend className="form-label small fw-semibold mb-1">Prefer mosques with</legend>
                {FACILITY_OPTIONS.map((facility) => (
                  <div className="form-check form-check-inline small" key={facility.key}>
                    <input id={`journey-facility-${facility.key}`} className="form-check-input" type="checkbox" checked={form.facilities.includes(facility.key)} onChange={() => toggleFacility(facility.key)} />
                    <label className="form-check-label" htmlFor={`journey-facility-${facility.key}`}>{facility.label}</label>
                  </div>
                ))}
              </fieldset>

              {error && <div className="alert alert-danger py-2 small mb-0" role="alert">{error}</div>}

              <button type="submit" className="btn btn-mc" disabled={status === "loading"}>
                {status === "loading" ? <><LoaderCircle className="spin" size={16} aria-hidden="true" /> Planning…</> : "Plan my prayers"}
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-8">
          {!plan && status !== "loading" && (
            <div className="mc-journey-empty card"><div className="card-body text-muted small">Enter a trip to see the prayers on the way.</div></div>
          )}
          <SkeletonRegion label="Loading plan…" loading={status === "loading" && !plan}><BlockStack heights={[56, 56, 56]} /></SkeletonRegion>

          {plan && (
            <div className="d-grid gap-3">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="small">
                  <strong>{plan.origin?.label || "Start"} → {plan.destination?.label || "Destination"}</strong>
                  <span className="text-muted"> · {(plan.route.distance_m / 1000).toFixed(0)} km · {formatMinutes(plan.route.duration_s / 60)} · leave {formatTime(plan.route.depart_at)}, arrive {formatTime(plan.route.arrive_at)}</span>
                  {plan.expired && <span className="badge text-bg-light ms-2">Saved plan — times were planned earlier</span>}
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-mc btn-sm" onClick={copyLink}><Copy size={14} aria-hidden="true" /> {copied ? "Copied" : "Share"}</button>
                  <a className="btn btn-mc btn-sm" href={mapsUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} aria-hidden="true" /> Open in Google Maps</a>
                </div>
              </div>

              <JourneyMap plan={plan} stops={stops} livePosition={livePosition} />
              <LiveTrip plan={plan} stops={stops} onReplan={replanFrom} onPosition={setLivePosition} replanning={replanning} />
              <PrayerTimelineList prayers={plan.prayers} selection={selection} onSelect={(key, mosqueId) => setSelection((s) => ({ ...s, [key]: mosqueId }))} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
