import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Pencil, Send, Trash2 } from "lucide-react";
import LocationPicker from "./LocationPicker";
import { formatEidDate } from "../eid/EidJamaatCard";
import {
  EID_OPTIONS,
  deleteEidJamaat,
  eidLabel,
  fetchAdminEidJamaats,
  publishEidJamaats,
  saveEidJamaat,
} from "../../utils/eidApi";
import { coordinatesOf } from "../../utils/mosqueDiscovery";
import { formatClockTime } from "../../utils/prayerTime";

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
  const [jamaats, setJamaats] = useState([]);
  const [season, setSeason] = useState(null);
  const [eid, setEid] = useState(null);
  const [year, setYear] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
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
      setError("Choose the jamaat location on the map, or switch to “At the mosque”.");
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

    if (await run(() => saveEidJamaat(mosqueId, body, editingId), "Eid jamaat saved.")) {
      const savedYear = Number(form.date.slice(0, 4));
      if (savedYear && savedYear !== year) setYear(savedYear);
      setEditingId(null);
      setForm(emptyForm(defaultDate));
    }
  }

  function remove(jamaat) {
    if (!window.confirm(`Delete the ${formatClockTime(jamaat.jamaat_time)} jamaat?`)) return;
    run(() => deleteEidJamaat(mosqueId, jamaat.id), "Eid jamaat deleted.");
    if (editingId === jamaat.id) cancelEdit();
  }

  if (loading && !eid) return <p role="status">Loading Eid jamaats…</p>;

  return (
    <section>
      <h2 className="h4 mb-2">Manage Eid Jamaat</h2>
      <p className="text-muted">
        List every Eid jamaat your mosque holds, including any at an Eidgah or open field. New jamaats stay as drafts until you
        publish them; publishing shows them on your profile and the Eid page, and notifies your followers.
      </p>
      {season ? (
        <p className="small mb-3">
          <span className="badge mc-badge me-2">{season.active ? "Showing now" : "Upcoming"}</span>
          {season.label} {season.year} is expected on {formatEidDate(season.expected_date)}; the public Eid page opens on {formatEidDate(season.show_from)}.
        </p>
      ) : (
        <p className="small text-muted mb-3">The Eid season has not been announced yet. You can still prepare your jamaats.</p>
      )}

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {message && <div className="alert alert-success" role="status">{message}</div>}

      <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
        <div>
          <label className="form-label small mb-1" htmlFor="eid-select">Eid</label>
          <select id="eid-select" className="form-select" value={eid || ""} onChange={(e) => { setEid(e.target.value); cancelEdit(); }}>
            {EID_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label small mb-1" htmlFor="eid-year">Year</label>
          <select id="eid-year" className="form-select" value={year || ""} onChange={(e) => { setYear(Number(e.target.value)); cancelEdit(); }}>
            {yearOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-mc ms-auto"
          disabled={busy || drafts === 0}
          onClick={() => run(() => publishEidJamaats(mosqueId, eid, year), "Eid jamaat times published.")}
          title={drafts === 0 ? "There are no draft jamaats to publish." : undefined}
        >
          <Send size={16} aria-hidden="true" /> Publish {drafts > 0 ? `${drafts} draft${drafts > 1 ? "s" : ""}` : ""} &amp; notify followers
        </button>
      </div>

      <div className="border rounded mb-4">
        {current.length === 0 ? (
          <p className="text-muted p-3 mb-0">No {eidLabel(eid)} {year} jamaats yet. Add the first one below.</p>
        ) : current.map((jamaat) => (
          <div className="d-flex align-items-start gap-3 p-3 border-bottom" key={jamaat.id}>
            <div className="text-nowrap">
              <strong className="d-block">{formatClockTime(jamaat.jamaat_time)}</strong>
              <small className="text-muted">{formatEidDate(jamaat.date)}</small>
            </div>
            <div className="flex-grow-1 small">
              <div>
                <MapPin size={14} className="me-1" aria-hidden="true" />
                {jamaat.location_name || "At the mosque"}
                {!jamaat.at_mosque && <span className="badge mc-badge ms-2">Separate location</span>}
              </div>
              <div className="text-muted">
                {[jamaat.khutbah_language && `Khutbah: ${jamaat.khutbah_language}`, jamaat.women_arrangement && "Women's arrangement"].filter(Boolean).join(" · ")}
              </div>
            </div>
            <span className={`badge ${jamaat.published ? "bg-success" : "bg-secondary"}`}>{jamaat.published ? "Published" : "Draft"}</span>
            <div className="d-flex gap-1">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(jamaat)} aria-label={`Edit ${jamaat.jamaat_time} jamaat`}><Pencil size={14} aria-hidden="true" /></button>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(jamaat)} disabled={busy} aria-label={`Delete ${jamaat.jamaat_time} jamaat`}><Trash2 size={14} aria-hidden="true" /></button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={save} className="border rounded p-3">
        <h3 className="h5">{editingId ? "Edit jamaat" : `Add an ${eidLabel(eid)} jamaat`}</h3>
        <div className="row g-3">
          <div className="col-sm-6">
            <label className="form-label" htmlFor="eid-date">Date</label>
            <input id="eid-date" type="date" className="form-control" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="eid-time">Jamaat time</label>
            <input id="eid-time" type="time" className="form-control" required value={form.jamaat_time} onChange={(e) => setForm({ ...form, jamaat_time: e.target.value })} />
          </div>

          <fieldset className="col-12">
            <legend className="form-label fs-6">Where is this jamaat held?</legend>
            <div className="form-check form-check-inline">
              <input className="form-check-input" type="radio" id="eid-at-mosque" name="eid-place" checked={!form.away} onChange={() => setForm({ ...form, away: false, point: null })} />
              <label className="form-check-label" htmlFor="eid-at-mosque">At the mosque</label>
            </div>
            <div className="form-check form-check-inline">
              <input className="form-check-input" type="radio" id="eid-away" name="eid-place" checked={form.away} onChange={() => setForm({ ...form, away: true, point: form.point || mosquePoint })} />
              <label className="form-check-label" htmlFor="eid-away">Separate location (Eidgah, field)</label>
            </div>
          </fieldset>

          <div className="col-12">
            <label className="form-label" htmlFor="eid-location-name">{form.away ? "Location name" : "Place in the mosque (optional)"}</label>
            <input
              id="eid-location-name"
              className="form-control"
              maxLength={255}
              required={form.away}
              placeholder={form.away ? "e.g. Central Eidgah field" : "e.g. Main hall"}
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
            <label className="form-label" htmlFor="eid-language">Khutbah language</label>
            <input id="eid-language" className="form-control" list="eid-languages" maxLength={50} value={form.khutbah_language} onChange={(e) => setForm({ ...form, khutbah_language: e.target.value })} />
            <datalist id="eid-languages">{LANGUAGES.map((language) => <option key={language} value={language} />)}</datalist>
          </div>
          <div className="col-sm-6 d-flex align-items-end">
            <div className="form-check mb-2">
              <input className="form-check-input" type="checkbox" id="eid-women" checked={form.women_arrangement} onChange={(e) => setForm({ ...form, women_arrangement: e.target.checked })} />
              <label className="form-check-label" htmlFor="eid-women">Arrangements for women</label>
            </div>
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="eid-notes">Notes (optional)</label>
            <textarea id="eid-notes" className="form-control" rows="2" maxLength={1000} placeholder="e.g. Bring a prayer mat. In heavy rain the jamaat moves to the main hall." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="d-flex gap-2 mt-3">
          <button className="btn btn-mc" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add jamaat"}</button>
          {editingId && <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit}>Cancel</button>}
          <Link to={`/mosque/${mosqueId}#eid-jamaat`} className="btn btn-link ms-auto">View public profile</Link>
        </div>
      </form>
    </section>
  );
}
