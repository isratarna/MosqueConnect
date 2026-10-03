import { useCallback, useEffect, useState } from "react";
import { Moon, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale } from "../../hooks/useLocale";
import { fetchAdminPrayerSchedule } from "../../utils/dashboardApi";
import { formatApiDate } from "../../utils/intl";
import { createSchedulePeriod, deleteSchedulePeriod, fetchSchedulePeriods, savePeriodPrayerTimes, updateSchedulePeriod } from "../../utils/scheduleApi";
import ConfirmDialog from "../ConfirmDialog";
import { BlockStack, SkeletonRegion } from "../skeletons";
import PrayerTimesGrid, { rowsFromTimes, timesFromRows } from "./PrayerTimesGrid";
import RamadanTimingsEditor from "./RamadanTimingsEditor";

const EMPTY_FORM = { id: null, name: "", starts_on: "", ends_on: "", is_ramadan: false };

/** Daily prayer times for one period (same grid as the default timetable). */
function PeriodTimes({ mosqueId, period, onSaved }) {
  const { t, locale } = useLocale();
  const [times, setTimes] = useState(() => timesFromRows(period.prayer_times));
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  const copyDefault = async () => {
    setNotice(null);
    try {
      const schedule = await fetchAdminPrayerSchedule(mosqueId);
      setTimes(timesFromRows(schedule.prayer_schedule));
    } catch (error) {
      setNotice({ ok: false, text: error.message });
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const saved = await savePeriodPrayerTimes(mosqueId, period.id, rowsFromTimes(times));
      setNotice({ ok: true, text: t("schedule.times.saved") });
      onSaved(saved);
    } catch (error) {
      setNotice({ ok: false, text: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-3">
      <h4 className="h6">{t("schedule.times.title", { name: period.name })}</h4>
      <p className="small text-muted">{t("schedule.times.help", { from: formatApiDate(period.starts_on, locale), to: formatApiDate(period.ends_on, locale) })}</p>
      <PrayerTimesGrid times={times} onChange={(prayer, field, value) => setTimes((all) => ({ ...all, [prayer]: { ...all[prayer], [field]: value } }))} idPrefix={`period-${period.id}`} />
      {notice && <div className={`alert ${notice.ok ? "alert-success" : "alert-danger"} py-2 small`} role={notice.ok ? "status" : "alert"}>{notice.text}</div>}
      <div className="d-flex flex-wrap gap-2">
        <button type="submit" className="btn btn-mc btn-sm" disabled={saving}>{saving ? t("schedule.saving") : t("schedule.times.save")}</button>
        <button type="button" className="btn btn-outline-mc btn-sm" onClick={copyDefault}>{t("schedule.times.copyDefault")}</button>
      </div>
    </form>
  );
}

/**
 * [Urmee · F4] Dashboard "Prayer & Jamat" → dated schedule periods ("Winter timetable", "Ramadan 1448").
 * Lists the periods with add / edit / delete (the API's "periods cannot overlap" error is shown next to
 * the date it is about), and opens each period's own prayer times — plus the Sehri / Iftar / Taraweeh
 * month grid for Ramadan periods. Outside every period the default timetable above still applies.
 */
export default function SchedulePeriodsManager({ mosqueId }) {
  const { t, locale } = useLocale();
  const [state, setState] = useState({ status: "loading", periods: [], error: "" });
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async (signal) => {
    try {
      const periods = await fetchSchedulePeriods(mosqueId, { signal });
      setState({ status: "done", periods, error: "" });
    } catch (error) {
      if (error.name !== "AbortError") setState({ status: "error", periods: [], error: error.message });
    }
  }, [mosqueId]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", periods: [], error: "" });
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setFormError("");
    const body = { name: form.name.trim(), starts_on: form.starts_on, ends_on: form.ends_on, is_ramadan: form.is_ramadan };
    try {
      const saved = form.id ? await updateSchedulePeriod(mosqueId, form.id, body) : await createSchedulePeriod(mosqueId, body);
      setForm(null);
      setOpenId(saved.id);
      await load();
    } catch (error) {
      // Overlap and date errors come back per field (starts_on, ends_on, …): show them under that field.
      setFieldErrors(error.errors || {});
      setFormError(error.errors && Object.keys(error.errors).length ? "" : error.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field) => fieldErrors[field] && <div className="invalid-feedback d-block">{fieldErrors[field][0]}</div>;
  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: field === "is_ramadan" ? event.target.checked : event.target.value }));

  return (
    <section className="mt-5" aria-labelledby="periods-title">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
        <h2 id="periods-title" className="h4 mb-0">{t("schedule.periodsTitle")}</h2>
        {!form && <button type="button" className="btn btn-outline-mc btn-sm" onClick={() => { setForm(EMPTY_FORM); setFieldErrors({}); setFormError(""); }}><Plus size={14} aria-hidden="true" /> {t("schedule.addPeriod")}</button>}
      </div>
      <p className="text-muted small">{t("schedule.periodsHelp")}</p>

      {form && (
        <form onSubmit={submit} className="card border-0 bg-body-tertiary p-3 mb-3">
          {formError && <div className="alert alert-danger py-2 small" role="alert">{formError}</div>}
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label small fw-semibold" htmlFor="period-name">{t("schedule.form.name")}</label>
              <input id="period-name" className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`} required maxLength={255} placeholder={t("schedule.form.namePlaceholder")} value={form.name} onChange={setField("name")} />
              {fieldError("name")}
            </div>
            <div className="col-sm-6">
              <label className="form-label small fw-semibold" htmlFor="period-start">{t("schedule.form.startsOn")}</label>
              <input id="period-start" type="date" className={`form-control ${fieldErrors.starts_on ? "is-invalid" : ""}`} required value={form.starts_on} onChange={setField("starts_on")} />
              {fieldError("starts_on")}
            </div>
            <div className="col-sm-6">
              <label className="form-label small fw-semibold" htmlFor="period-end">{t("schedule.form.endsOn")}</label>
              <input id="period-end" type="date" className={`form-control ${fieldErrors.ends_on ? "is-invalid" : ""}`} required min={form.starts_on || undefined} value={form.ends_on} onChange={setField("ends_on")} />
              {fieldError("ends_on")}
            </div>
            <div className="col-12">
              <div className="form-check">
                <input id="period-ramadan" className="form-check-input" type="checkbox" checked={form.is_ramadan} onChange={setField("is_ramadan")} />
                <label className="form-check-label" htmlFor="period-ramadan">{t("schedule.form.isRamadan")}</label>
              </div>
              {fieldError("is_ramadan")}
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button type="submit" className="btn btn-mc btn-sm" disabled={saving}>{saving ? t("schedule.saving") : t("schedule.form.save")}</button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setForm(null)} disabled={saving}>{t("common.cancel")}</button>
          </div>
        </form>
      )}

      <SkeletonRegion label={t("schedule.loading")} loading={state.status === "loading"}><BlockStack heights={[64, 64]} /></SkeletonRegion>
      {state.status === "error" && <div className="alert alert-danger" role="alert">{state.error} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => load()}>{t("common.retry")}</button></div>}
      {state.status === "done" && state.periods.length === 0 && !form && <p className="text-muted">{t("schedule.noPeriods")}</p>}

      <div className="d-grid gap-3">
        {state.periods.map((period) => (
          <article key={period.id} className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <h3 className="h6 mb-0 me-auto">{period.name}</h3>
                {period.is_ramadan && <span className="badge text-bg-warning"><Moon size={12} aria-hidden="true" /> {t("schedule.ramadanBadge")}</span>}
                <span className="small text-muted">{formatApiDate(period.starts_on, locale)} – {formatApiDate(period.ends_on, locale)}</span>
              </div>
              <div className="d-flex flex-wrap gap-2 mt-2">
                <button type="button" className="btn btn-sm btn-outline-mc" aria-expanded={openId === period.id} onClick={() => setOpenId(openId === period.id ? null : period.id)}>
                  {openId === period.id ? t("schedule.close") : t("schedule.editTimes")}
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setForm({ id: period.id, name: period.name, starts_on: period.starts_on, ends_on: period.ends_on, is_ramadan: period.is_ramadan }); setFieldErrors({}); setFormError(""); }}><Pencil size={13} aria-hidden="true" /> {t("schedule.editDetails")}</button>
                <button type="button" className="btn btn-sm btn-outline-danger ms-auto" onClick={() => setConfirm(period)}><Trash2 size={13} aria-hidden="true" /> {t("schedule.delete")}</button>
              </div>
              {openId === period.id && (
                <>
                  <PeriodTimes key={`times-${period.id}`} mosqueId={mosqueId} period={period} onSaved={() => load()} />
                  {period.is_ramadan && <RamadanTimingsEditor key={`ramadan-${period.id}`} mosqueId={mosqueId} period={period} onSaved={() => load()} />}
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      {confirm && (
        <ConfirmDialog
          title={t("schedule.deleteTitle")}
          message={t("schedule.deleteMessage", { name: confirm.name })}
          confirmLabel={t("schedule.deleteConfirm")}
          tone="danger"
          onConfirm={async () => { await deleteSchedulePeriod(mosqueId, confirm.id); if (openId === confirm.id) setOpenId(null); await load(); }}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}
