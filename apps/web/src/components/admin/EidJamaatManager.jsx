import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Pencil, Send, Trash2 } from "lucide-react";
import ConfirmDialog from "../ConfirmDialog";
import LocationPicker from "./LocationPicker";
import { formatEidDate } from "../eid/EidJamaatCard";
import {
  EID_OPTIONS,
  deleteEidJamaat,
  eidNameT,
  fetchAdminEidJamaats,
  publishEidJamaats,
  saveEidJamaat,
} from "../../utils/eidApi";
import { coordinatesOf } from "../../utils/mosqueDiscovery";
import { formatClockTime } from "../../utils/prayerTime";
import { BlockStack, SkeletonRegion } from "../skeletons";
import { useLocale } from "../../hooks/useLocale";

const LANGUAGES = ["Bangla", "Arabic", "English", "Urdu"];
const emptyForm = (date = "") => ({
  date,
  jamaat_time: "",
  location_name: "",
  away: false,
  point: null,
  khutbah_language: "Bangla",
  women_arrangement: false,
  notes: "",
});

/** Dashboard editor for a mosque's Eid jamaats, one Eid at a time. */
export default function EidJamaatManager({ mosqueId, mosque }) {
  const { t, locale } = useLocale(); // [Urmee · i18n dashboard] text from the locale files; dates and times follow the language
  const [jamaats, setJamaats] = useState([]);
  const [season, setSeason] = useState(null);
  const [eid, setEid] = useState(null);
  const [year, setYear] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchAdminEidJamaats(mosqueId, { signal: controller.signal })
      .then((payload) => {
        setJamaats(payload.data || []);
        setSeason(payload.season || null);
        // Start on the configured Eid, otherwise the most recent one edited.
        setEid((current) => current || payload.season?.eid || payload.data?.[0]?.eid || "fitr");
        setYear((current) => current || payload.season?.year || payload.data?.[0]?.year || new Date().getFullYear());
      })
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mosqueId, revision]);

  const seasonMatches = season && season.eid === eid && season.year === year;
  const defaultDate = seasonMatches ? season.expected_date : "";

  useEffect(() => {
    if (!editingId) setForm(emptyForm(defaultDate));
  }, [eid, year, defaultDate, editingId]);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return [...new Set([now, now + 1, season?.year, year, ...jamaats.map((item) => item.year)].filter(Boolean))].sort((a, b) => b - a);
  }, [jamaats, season, year]);

  const mosquePoint = coordinatesOf(mosque);
  const current = jamaats.filter((item) => item.eid === eid && item.year === year);
  const drafts = current.filter((item) => !item.published).length;

  function startEdit(jamaat) {
    setEditingId(jamaat.id);
    setMessage("");
    setForm({
      date: jamaat.date,
      jamaat_time: jamaat.jamaat_time,
      location_name: jamaat.location_name || "",
      away: !jamaat.at_mosque,
      point: jamaat.at_mosque ? null : { lat: jamaat.latitude, lng: jamaat.longitude },
      khutbah_language: jamaat.khutbah_language || "",
      women_arrangement: Boolean(jamaat.women_arrangement),
      notes: jamaat.notes || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm(defaultDate));
  }

  async function run(action, success) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await action();
      setMessage(result?.message || success);
      setRevision((n) => n + 1);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    if (form.away && (form.point?.lat === "" || form.point?.lng === "" || !form.point)) {
      setError(t("eid.admin.chooseOnMap"));
      return;
    }

    const body = {
      eid,
      date: form.date,
      jamaat_time: form.jamaat_time,
      location_name: form.location_name.trim() || null,
      latitude: form.away ? form.point.lat : null,
      longitude: form.away ? form.point.lng : null,
      khutbah_language: form.khutbah_language.trim() || null,
      women_arrangement: form.women_arrangement,
      notes: form.notes.trim() || null,
    };

    if (await run(() => saveEidJamaat(mosqueId, body, editingId), t("eid.admin.saved"))) {
      const savedYear = Number(form.date.slice(0, 4));
      if (savedYear && savedYear !== year) setYear(savedYear);
      setEditingId(null);
      setForm(emptyForm(defaultDate));
    }
  }

  function remove(jamaat) {
    setDeleting(jamaat);
  }

  function confirmRemove() {
    const jamaat = deleting;
    run(() => deleteEidJamaat(mosqueId, jamaat.id), t("eid.admin.deleted"));
    if (editingId === jamaat.id) cancelEdit();
  }

  if (loading && !eid) return <SkeletonRegion label={t("eid.admin.loading")}><BlockStack heights={[48, 160]} /></SkeletonRegion>;

  return (
    <section>
      <h2 className="h4 mb-2">{t("eid.admin.heading")}</h2>
      <p className="text-muted">{t("eid.admin.intro")}</p>
      {season ? (
        <p className="small mb-3">
          <span className="badge mc-badge me-2">{season.active ? t("eid.admin.showingNow") : t("eid.admin.upcoming")}</span>
          {t("eid.admin.seasonInfo", { label: eidNameT(t, season.eid, season.label), year: season.year, date: formatEidDate(season.expected_date, locale), opens: formatEidDate(season.show_from, locale) })}
        </p>
      ) : (
        <p className="small text-muted mb-3">{t("eid.admin.notAnnounced")}</p>
      )}

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {message && <div className="alert alert-success" role="status">{message}</div>}

      <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
        <div>
          <label className="form-label small mb-1" htmlFor="eid-select">{t("eid.admin.eid")}</label>
          <select id="eid-select" className="form-select" value={eid || ""} onChange={(e) => { setEid(e.target.value); cancelEdit(); }}>
            {EID_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(`eid.${option.value}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label small mb-1" htmlFor="eid-year">{t("eid.admin.year")}</label>
          <select id="eid-year" className="form-select" value={year || ""} onChange={(e) => { setYear(Number(e.target.value)); cancelEdit(); }}>
            {yearOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-mc ms-auto"
          disabled={busy || drafts === 0}
          onClick={() => run(() => publishEidJamaats(mosqueId, eid, year), t("eid.admin.published"))}
          title={drafts === 0 ? t("eid.admin.noDrafts") : undefined}
        >
          <Send size={16} aria-hidden="true" /> {drafts > 0 ? t("eid.admin.publishDrafts", { count: drafts }) : t("eid.admin.publishNone")}
        </button>
      </div>

      <div className="border rounded mb-4">
        {current.length === 0 ? (
          <p className="text-muted p-3 mb-0">{t("eid.admin.none", { eid: eidNameT(t, eid), year })}</p>
        ) : current.map((jamaat) => (
          <div className="d-flex align-items-start gap-3 p-3 border-bottom" key={jamaat.id}>
            <div className="text-nowrap">
              <strong className="d-block">{formatClockTime(jamaat.jamaat_time, locale)}</strong>
              <small className="text-muted">{formatEidDate(jamaat.date, locale)}</small>
            </div>
            <div className="flex-grow-1 small">
              <div>
                <MapPin size={14} className="me-1" aria-hidden="true" />
                {jamaat.location_name || t("eid.atMosque")}
                {!jamaat.at_mosque && <span className="badge mc-badge ms-2">{t("eid.separateLocation")}</span>}
              </div>
              <div className="text-muted">
                {[jamaat.khutbah_language && t("eid.khutbahLanguage", { language: jamaat.khutbah_language }), jamaat.women_arrangement && t("eid.womenArrangement")].filter(Boolean).join(" · ")}
              </div>
            </div>
            <span className={`badge ${jamaat.published ? "bg-success" : "bg-secondary"}`}>{jamaat.published ? t("eid.admin.publishedBadge") : t("eid.admin.draftBadge")}</span>
            <div className="d-flex gap-1">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(jamaat)} aria-label={t("eid.admin.editAria", { time: formatClockTime(jamaat.jamaat_time, locale) })}><Pencil size={14} aria-hidden="true" /></button>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(jamaat)} disabled={busy} aria-label={t("eid.admin.deleteAria", { time: formatClockTime(jamaat.jamaat_time, locale) })}><Trash2 size={14} aria-hidden="true" /></button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={save} className="border rounded p-3">
        <h3 className="h5">{editingId ? t("eid.admin.editTitle") : t("eid.admin.addTitle", { eid: eidNameT(t, eid) })}</h3>
        <div className="row g-3">
          <div className="col-sm-6">
            <label className="form-label" htmlFor="eid-date">{t("eid.admin.date")}</label>
            <input id="eid-date" type="date" className="form-control" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="eid-time">{t("eid.admin.jamaatTime")}</label>
            <input id="eid-time" type="time" className="form-control" required value={form.jamaat_time} onChange={(e) => setForm({ ...form, jamaat_time: e.target.value })} />
          </div>

          <fieldset className="col-12">
            <legend className="form-label fs-6">{t("eid.admin.where")}</legend>
            <div className="form-check form-check-inline">
              <input className="form-check-input" type="radio" id="eid-at-mosque" name="eid-place" checked={!form.away} onChange={() => setForm({ ...form, away: false, point: null })} />
              <label className="form-check-label" htmlFor="eid-at-mosque">{t("eid.admin.atMosqueOption")}</label>
            </div>
            <div className="form-check form-check-inline">
              <input className="form-check-input" type="radio" id="eid-away" name="eid-place" checked={form.away} onChange={() => setForm({ ...form, away: true, point: form.point || mosquePoint })} />
              <label className="form-check-label" htmlFor="eid-away">{t("eid.admin.awayOption")}</label>
            </div>
          </fieldset>

          <div className="col-12">
            <label className="form-label" htmlFor="eid-location-name">{form.away ? t("eid.admin.locationName") : t("eid.admin.placeInMosque")}</label>
            <input
              id="eid-location-name"
              className="form-control"
              maxLength={255}
              required={form.away}
              placeholder={form.away ? t("eid.admin.locationPlaceholderAway") : t("eid.admin.locationPlaceholderMosque")}
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
            />
          </div>

          {form.away && (
            <div className="col-12">
              <LocationPicker
                idPrefix="eid-location"
                value={form.point}
                center={mosquePoint}
                onChange={(point) => setForm((prev) => ({ ...prev, point }))}
              />
            </div>
          )}

          <div className="col-sm-6">
            <label className="form-label" htmlFor="eid-language">{t("eid.admin.khutbahLanguage")}</label>
            <input id="eid-language" className="form-control" list="eid-languages" maxLength={50} value={form.khutbah_language} onChange={(e) => setForm({ ...form, khutbah_language: e.target.value })} />
            <datalist id="eid-languages">{LANGUAGES.map((language) => <option key={language} value={language} />)}</datalist>
          </div>
          <div className="col-sm-6 d-flex align-items-end">
            <div className="form-check mb-2">
              <input className="form-check-input" type="checkbox" id="eid-women" checked={form.women_arrangement} onChange={(e) => setForm({ ...form, women_arrangement: e.target.checked })} />
              <label className="form-check-label" htmlFor="eid-women">{t("eid.admin.womenArrangements")}</label>
            </div>
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="eid-notes">{t("eid.admin.notes")}</label>
            <textarea id="eid-notes" className="form-control" rows="2" maxLength={1000} placeholder={t("eid.admin.notesPlaceholder")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="d-flex gap-2 mt-3">
          <button className="btn btn-mc" disabled={busy}>{busy ? t("eid.admin.saving") : editingId ? t("eid.admin.saveChanges") : t("eid.admin.addJamaat")}</button>
          {editingId && <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit}>{t("common.cancel")}</button>}
          <Link to={`/mosque/${mosqueId}#eid-jamaat`} className="btn btn-link ms-auto">{t("eid.admin.viewPublic")}</Link>
        </div>
      </form>
      {deleting && <ConfirmDialog title={t("eid.admin.deleteTitle")} message={t("eid.admin.deleteMessage", { time: formatClockTime(deleting.jamaat_time, locale) })} confirmLabel={t("eid.admin.deleteConfirm")} tone="danger" onConfirm={confirmRemove} onClose={() => setDeleting(null)} />}
    </section>
  );
}
