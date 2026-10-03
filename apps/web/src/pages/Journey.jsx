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
  planJourney,
  selectedStops,
} from "../utils/journeyApi";
import { BlockStack, SkeletonRegion } from "../components/skeletons";
import { useLocale } from "../hooks/useLocale";
import { formatMinutesT, formatTimeT } from "../utils/journeyFormat";

/*
 * /journey ar /journey/:id. Form -> POST /api/journeys/plan -> map + timeline.
 * Plan-er id URL e boshai, tai link ta share kora jay (cache expire holeo dekha jay).
 */
export default function Journey() {
  // [Urmee · i18n journey] All visible text comes from t(); times and durations use the active language.
  const { t, locale } = useLocale();
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
        setError(err.status === 404 ? t("journey.notFound") : err.message);
        setStatus("error");
      });
  }, [id, plan?.id]);

  const stops = useMemo(() => selectedStops(plan?.prayers, selection), [plan, selection]);
  const mapsUrl = plan ? buildMapsUrl({ origin: plan.origin, destination: plan.destination, stops, mode: plan.mode }) : null;

  const submit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!form.destination) {
      setError(t("journey.chooseDestination"));
      return;
    }

    let origin = form.origin;
    if (origin?.current) {
      const here = await requestGeolocation({ force: true });
      if (here.status !== "success") {
        setError(here.message || t("journey.locationFailed"));
        return;
      }
      origin = { lat: here.lat, lng: here.lng, label: t("journey.myLocation") };
    }

    if (!origin) {
      setError(t("journey.chooseOrigin"));
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
      origin: { lat: here.lat, lng: here.lng, label: t("journey.currentPosition") },
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
      <h1 className="h4 d-flex align-items-center gap-2"><RouteIcon size={22} aria-hidden="true" /> {t("journey.title")}</h1>
      <p className="text-muted small">
        {t("journey.intro")}
      </p>

      <div className="row g-4">
        <div className="col-lg-4">
          <form className="card" onSubmit={submit}>
            <div className="card-body d-grid gap-3">
              <PlaceInput id="journey-origin" label={t("journey.from")} value={form.origin} allowCurrent onChange={(origin) => setForm((f) => ({ ...f, origin }))} />
              <PlaceInput id="journey-destination" label={t("journey.to")} value={form.destination} onChange={(destination) => setForm((f) => ({ ...f, destination }))} />

              <div className="row g-2">
                <div className="col-7">
                  <label className="form-label small fw-semibold" htmlFor="journey-depart">{t("journey.leavingAt")}</label>
                  <input id="journey-depart" type="datetime-local" className="form-control form-control-sm" value={form.departAt} onChange={(e) => setForm((f) => ({ ...f, departAt: e.target.value }))} />
                  <div className="form-text">{t("journey.emptyIsNow")}</div>
                </div>
                <div className="col-5">
                  <label className="form-label small fw-semibold" htmlFor="journey-mode">{t("journey.mode")}</label>
                  <select id="journey-mode" className="form-select form-select-sm" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
                    <option value="drive">{t("journey.car")}</option>
                    <option value="walk">{t("journey.walkShort")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label small fw-semibold" htmlFor="journey-corridor">{t("journey.corridor", { km: form.corridorKm })}</label>
                <input id="journey-corridor" type="range" className="form-range" min="0.5" max="5" step="0.5" value={form.corridorKm} onChange={(e) => setForm((f) => ({ ...f, corridorKm: e.target.value }))} />
              </div>

              <div>
                <label className="form-label small fw-semibold" htmlFor="journey-duration">{t("journey.duration", { min: form.prayerDuration })}</label>
                <input id="journey-duration" type="range" className="form-range" min="10" max="30" step="5" value={form.prayerDuration} onChange={(e) => setForm((f) => ({ ...f, prayerDuration: e.target.value }))} />
              </div>

              <fieldset>
                <legend className="form-label small fw-semibold mb-1">{t("journey.preferWith")}</legend>
                {FACILITY_OPTIONS.map((facility) => (
                  <div className="form-check form-check-inline small" key={facility.key}>
                    <input id={`journey-facility-${facility.key}`} className="form-check-input" type="checkbox" checked={form.facilities.includes(facility.key)} onChange={() => toggleFacility(facility.key)} />
                    <label className="form-check-label" htmlFor={`journey-facility-${facility.key}`}>{t(`facility.${facility.key}`, { defaultValue: facility.label })}</label>
                  </div>
                ))}
              </fieldset>

              {error && <div className="alert alert-danger py-2 small mb-0" role="alert">{error}</div>}

              <button type="submit" className="btn btn-mc" disabled={status === "loading"}>
                {status === "loading" ? <><LoaderCircle className="spin" size={16} aria-hidden="true" /> {t("journey.planning")}</> : t("journey.plan")}
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-8">
          {!plan && status !== "loading" && (
            <div className="mc-journey-empty card"><div className="card-body text-muted small">{t("journey.emptyPrompt")}</div></div>
          )}
          <SkeletonRegion label={t("journey.loadingPlan")} loading={status === "loading" && !plan}><BlockStack heights={[56, 56, 56]} /></SkeletonRegion>

          {plan && (
            <div className="d-grid gap-3">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="small">
                  <strong>{plan.origin?.label || t("journey.start")} → {plan.destination?.label || t("journey.destination")}</strong>
                  <span className="text-muted"> · {t("journey.summary", { km: (plan.route.distance_m / 1000).toFixed(0), duration: formatMinutesT(t, plan.route.duration_s / 60), depart: formatTimeT(plan.route.depart_at, locale), arrive: formatTimeT(plan.route.arrive_at, locale) })}</span>
                  {plan.expired && <span className="badge text-bg-light ms-2">{t("journey.savedPlan")}</span>}
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-mc btn-sm" onClick={copyLink}><Copy size={14} aria-hidden="true" /> {copied ? t("journey.copied") : t("journey.share")}</button>
                  <a className="btn btn-mc btn-sm" href={mapsUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} aria-hidden="true" /> {t("journey.openMaps")}</a>
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
