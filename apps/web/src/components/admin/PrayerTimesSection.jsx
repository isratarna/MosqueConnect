import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { fetchAdminPrayerSchedule, savePrayerSchedule } from "../../utils/dashboardApi";
import { BlockStack, SkeletonRegion } from "../skeletons";
import { useLocale } from "../../hooks/useLocale";
import PrayerTimesGrid, { rowsFromTimes, timesFromRows } from "./PrayerTimesGrid";
import SchedulePeriodsManager from "./SchedulePeriodsManager";

const SESSION_NAMES = ["First Jumuah", "Second Jumuah", "Third Jumuah", "Fourth Jumuah"];

/** Loads the admin prayer schedule once per mosque, with retry. */
function useSchedule(mosqueId) {
  const [schedule, setSchedule] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setSchedule(null);
    setLoadError("");
    fetchAdminPrayerSchedule(mosqueId, { signal: controller.signal })
      .then(setSchedule)
      .catch((err) => { if (err.name !== "AbortError") setLoadError(err.message); });
    return () => controller.abort();
  }, [mosqueId, attempt]);

  return { schedule, loadError, retry: () => setAttempt((n) => n + 1) };
}

function Feedback({ loadError, retry, error, message }) {
  const { t } = useLocale();
  return (
    <>
      {loadError && <div className="alert alert-danger" role="alert">{loadError} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={retry}>{t("common.retry")}</button></div>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {message && <div className="alert alert-success py-2" role="status">{message}</div>}
    </>
  );
}

function LoadingRows({ label, rows }) {
  return (
    <SkeletonRegion label={label}><BlockStack heights={Array.from({ length: rows }, () => 38)} /></SkeletonRegion>
  );
}

/** Dashboard section "Prayer & Jamat": adhan and jamaat for the five daily prayers. */
export function DailyPrayersForm({ mosqueId }) {
  const { t } = useLocale(); // [Urmee · i18n dashboard] text from the locale files
  const { schedule, loadError, retry } = useSchedule(mosqueId);
  const [times, setTimes] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!schedule) return;
    setTimes(timesFromRows(schedule.prayer_schedule));
  }, [schedule]);

  const setTime = (prayer, field, value) => setTimes((all) => ({ ...all, [prayer]: { ...all[prayer], [field]: value } }));

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await savePrayerSchedule(mosqueId, { prayer_schedule: rowsFromTimes(times) });
      setMessage(t("prayerAdmin.saved"));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <form onSubmit={onSubmit}>
      <h2 className="h4 mb-1">{t("prayerAdmin.heading")}</h2>
      <p className="text-muted small">{t("prayerAdmin.intro")}</p>
      <Feedback loadError={loadError} retry={retry} error={error} message={message} />
      {!schedule ? (!loadError && <LoadingRows label={t("prayerAdmin.loading")} rows={5} />) : (
        <>
          <PrayerTimesGrid times={times} onChange={setTime} idPrefix="default" />
          <button type="submit" className="btn btn-mc" disabled={saving}>{saving ? t("prayerAdmin.saving") : t("prayerAdmin.save")}</button>
        </>
      )}
    </form>
    {/* [Urmee · VIVA] Default timetable er niche ei component boshano (ager form ta PrayerTimesGrid use kore). */}
    {/* [Urmee · F4] Dated periods (winter timetable, Ramadan) sit under the default timetable. */}
    <SchedulePeriodsManager mosqueId={mosqueId} />
    </>
  );
}

/** Dashboard section "Jummah": one or more Friday sessions. */
export function JumuahForm({ mosqueId }) {
  const { t } = useLocale();
  const { schedule, loadError, retry } = useSchedule(mosqueId);
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fromApi = (rows) => rows.map((row) => ({ ...row, khutbah_time: row.khutbah_time || "", notes: row.notes || "" }));

  useEffect(() => {
    if (!schedule) return;
    const rows = fromApi(schedule.jumuah_sessions);
    setSessions(rows.length ? rows : [{ sequence: 1, label: SESSION_NAMES[0], khutbah_time: "", jamaat_time: "", notes: "" }]);
  }, [schedule]);

  const edit = (sequence, field, value) => setSessions((rows) => rows.map((row) => (row.sequence === sequence ? { ...row, [field]: value } : row)));
  const addSession = () => setSessions((rows) => {
    const sequence = Math.max(0, ...rows.map((row) => row.sequence)) + 1;
    return [...rows, { sequence, label: SESSION_NAMES[sequence - 1] || `Jumuah ${sequence}`, khutbah_time: "", jamaat_time: "", notes: "", unsaved: true }];
  });
  const removeUnsaved = (sequence) => setSessions((rows) => rows.filter((row) => row.sequence !== sequence));

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await savePrayerSchedule(mosqueId, {
        jumuah_sessions: sessions.map((row) => ({
          sequence: row.sequence,
          label: row.label,
          khutbah_time: row.khutbah_time || null,
          jamaat_time: row.jamaat_time,
          notes: row.notes || null,
        })),
      });
      setSessions(fromApi(saved.jumuah_sessions));
      setMessage(t("jumuahAdmin.saved"));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="h4 mb-1">{t("jumuahAdmin.heading")}</h2>
      <p className="text-muted small">{t("jumuahAdmin.intro")}</p>
      <Feedback loadError={loadError} retry={retry} error={error} message={message} />
      {!schedule ? (!loadError && <LoadingRows label={t("jumuahAdmin.loading")} rows={3} />) : (
        <>
          <div className="d-grid gap-3 mb-3">
            {sessions.map((row) => (
              <fieldset key={row.sequence} className="border rounded p-3">
                <legend className="float-none w-auto px-1 fs-6 fw-semibold mb-0">{row.label || t("jumuahAdmin.session", { number: row.sequence })}</legend>
                <div className="row g-2">
                  <div className="col-sm-6 col-lg-3">
                    <label className="form-label small" htmlFor={`jumuah-${row.sequence}-label`}>{t("jumuahAdmin.name")}</label>
                    <input id={`jumuah-${row.sequence}-label`} className="form-control" maxLength={255} required value={row.label} onChange={(e) => edit(row.sequence, "label", e.target.value)} />
                  </div>
                  <div className="col-6 col-lg-3">
                    <label className="form-label small" htmlFor={`jumuah-${row.sequence}-khutbah`}>{t("jumuahAdmin.khutbah")}</label>
                    <input id={`jumuah-${row.sequence}-khutbah`} type="time" className="form-control" value={row.khutbah_time} onChange={(e) => edit(row.sequence, "khutbah_time", e.target.value)} />
                  </div>
                  <div className="col-6 col-lg-3">
                    <label className="form-label small" htmlFor={`jumuah-${row.sequence}-jamaat`}>{t("jumuahAdmin.jamaat")}</label>
                    <input id={`jumuah-${row.sequence}-jamaat`} type="time" className="form-control" required value={row.jamaat_time} onChange={(e) => edit(row.sequence, "jamaat_time", e.target.value)} />
                  </div>
                  <div className="col-sm-6 col-lg-3">
                    <label className="form-label small" htmlFor={`jumuah-${row.sequence}-notes`}>{t("jumuahAdmin.notes")}</label>
                    <input id={`jumuah-${row.sequence}-notes`} className="form-control" maxLength={1000} placeholder={t("jumuahAdmin.notesPlaceholder")} value={row.notes} onChange={(e) => edit(row.sequence, "notes", e.target.value)} />
                  </div>
                </div>
                {row.unsaved && (
                  <button type="button" className="btn btn-link btn-sm text-danger p-0 mt-2" onClick={() => removeUnsaved(row.sequence)}>{t("jumuahAdmin.remove")}</button>
                )}
              </fieldset>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="submit" className="btn btn-mc" disabled={saving}>{saving ? t("prayerAdmin.saving") : t("jumuahAdmin.save")}</button>
            {sessions.length < SESSION_NAMES.length && (
              <button type="button" className="btn btn-outline-secondary" onClick={addSession}><Plus size={16} aria-hidden="true" /> {t("jumuahAdmin.add")}</button>
            )}
          </div>
        </>
      )}
    </form>
  );
}
