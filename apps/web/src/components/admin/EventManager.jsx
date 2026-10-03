import { useEffect, useState } from "react";
import { useLocale } from "../../hooks/useLocale";
import { apiRequest } from "../../utils/api";
import { BlockStack, SkeletonRegion } from "../skeletons";
import { formatEventTime } from "../../utils/eventFilters";
import { formatApiDate } from "../../utils/intl";
import { eventCategoryLabel, statusLabel } from "../../utils/labels";

// Category values are what the API stores, so they stay English; only the
// label shown for each one is translated.
const categories = ["Islamic Lecture", "Quran Program", "Community Gathering", "Charity", "Volunteer Activity", "Youth Program", "Workshop", "Iftar", "Educational Program", "Other"];
const empty = { title: "", description: "", category: "Other", event_date: "", start_time: "", end_time: "", location: "", capacity: "", registration_required: false };
const FIELDS = [
  ["title", "admin.events.fields.title", "text"],
  ["event_date", "admin.events.fields.event_date", "date"],
  ["start_time", "admin.events.fields.start_time", "time"],
  ["end_time", "admin.events.fields.end_time", "time"],
  ["location", "admin.events.fields.location", "text"],
  ["capacity", "admin.events.fields.capacity", "number"],
];

export default function EventManager({ mosqueId }) {
  const { t, locale } = useLocale();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const base = `/api/admin/mosques/${mosqueId}/events`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    apiRequest(`${base}?page=${page}`, { signal: controller.signal })
      .then(({ data, meta }) => { setEvents(data); setLastPage(meta?.last_page || 1); })
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [base, page, revision]);

  async function mutate(path, method, body, success) {
    setBusy(true); setError(""); setMessage("");
    try {
      await apiRequest(path, { method, body });
      setMessage(success);
      setRevision((n) => n + 1);
      return true;
    } catch (err) { setError(err.message); return false; }
    finally { setBusy(false); }
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const body = { ...form, capacity: form.capacity === "" ? null : Number(form.capacity), end_time: form.end_time || null };
    if (!editingId) body.status = "draft";
    if (await mutate(editingId ? `${base}/${editingId}` : base, editingId ? "PATCH" : "POST", body, t("admin.events.saved"))) {
      setEditingId(null); setForm(empty);
    }
  }

  return <section>
    <h2 className="h4 mb-4">{t("admin.events.title")}</h2>
    {error && <div className="alert alert-danger" role="alert">{error} <button className="btn btn-sm btn-outline-danger" onClick={() => setRevision((n) => n + 1)}>{t("common.retry")}</button></div>}
    {message && <div className="alert alert-success" role="status">{message}</div>}
    <form onSubmit={save} className="border rounded p-3 mb-4">
      <h3 className="h5">{editingId ? t("admin.events.editEvent") : t("admin.events.newEvent")}</h3>
      <div className="row g-3">
        {FIELDS.map(([key, labelKey, type]) => <div className="col-sm-6" key={key}>
          <label className="form-label" htmlFor={`event-${key}`}>{t(labelKey)}</label><input id={`event-${key}`} className="form-control" type={type} value={form[key]} min={type === "number" ? 0 : undefined} maxLength={type === "text" ? 255 : undefined} required={!["end_time", "capacity"].includes(key)} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        </div>)}
        <div className="col-12"><label className="form-label" htmlFor="event-category">{t("admin.events.category")}</label><select id="event-category" className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((value) => <option key={value} value={value}>{eventCategoryLabel(t, value)}</option>)}</select></div>
        <div className="col-12"><label className="form-label" htmlFor="event-description">{t("admin.events.description")}</label><textarea id="event-description" className="form-control" maxLength={10000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="col-12"><label className="form-check"><input className="form-check-input" type="checkbox" checked={form.registration_required} onChange={(e) => setForm({ ...form, registration_required: e.target.checked })} />{t("admin.events.registrationRequired")}</label></div>
      </div>
      <div className="d-flex gap-2 mt-3"><button className="btn btn-mc" disabled={busy}>{busy ? t("admin.events.saving") : editingId ? t("admin.events.saveEvent") : t("admin.events.createDraft")}</button>{editingId && <button type="button" className="btn btn-outline-mc" onClick={() => { setEditingId(null); setForm(empty); }}>{t("admin.events.cancelEditing")}</button>}</div>
    </form>
    {loading ? <SkeletonRegion label={t("admin.events.loading")}><BlockStack heights={[96, 96]} /></SkeletonRegion> : events.length === 0 ? <p>{t("admin.events.none")}</p> : events.map((event) => <article key={event.id} className="border rounded p-3 mb-3">
      <h3 className="h5">{event.title}</h3><p>{formatApiDate(event.event_date, locale)} · {formatEventTime(event.start_time, locale)} · {statusLabel(t, event.status)}</p>
      <p className="small text-muted">{t("admin.events.registrations", { count: event.registrations_count || 0 })}</p>
      <div className="d-flex flex-wrap gap-2">
        {["draft", "published"].includes(event.status) && <button className="btn btn-sm btn-outline-mc" disabled={busy} onClick={() => { setEditingId(event.id); setForm(Object.fromEntries(Object.keys(empty).map((key) => [key, event[key] ?? empty[key]]))); }}>{t("admin.events.edit")}</button>}
        {event.status === "draft" && <button className="btn btn-sm btn-mc" disabled={busy} onClick={() => mutate(`${base}/${event.id}/publish`, "PATCH", undefined, t("admin.events.published"))}>{t("admin.events.publish")}</button>}
        {event.status === "published" && <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => mutate(`${base}/${event.id}/cancel`, "PATCH", undefined, t("admin.events.cancelled"))}>{t("admin.events.cancelEvent")}</button>}
        {event.status === "draft" && <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => mutate(`${base}/${event.id}`, "DELETE", undefined, t("admin.events.draftDeleted"))}>{t("admin.events.deleteDraft")}</button>}
      </div>
    </article>)}
    {lastPage > 1 && <div className="d-flex gap-3 align-items-center"><button className="btn btn-outline-mc" disabled={page === 1} onClick={() => setPage(page - 1)}>{t("common.previous")}</button><span>{t("admin.events.page", { page, last: lastPage })}</span><button className="btn btn-outline-mc" disabled={page === lastPage} onClick={() => setPage(page + 1)}>{t("common.next")}</button></div>}
  </section>;
}
