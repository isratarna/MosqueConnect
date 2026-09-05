import { useEffect, useState } from "react";
import { apiRequest } from "../../utils/api";

const categories = ["Islamic Lecture", "Quran Program", "Community Gathering", "Charity", "Volunteer Activity", "Youth Program", "Workshop", "Iftar", "Educational Program", "Other"];
const empty = { title: "", description: "", category: "Other", event_date: "", start_time: "", end_time: "", location: "", capacity: "", registration_required: false };

export default function EventManager({ mosqueId }) {
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
    if (await mutate(editingId ? `${base}/${editingId}` : base, editingId ? "PATCH" : "POST", body, "Event saved.")) {
      setEditingId(null); setForm(empty);
    }
  }

  return <section>
    <h2 className="h4 mb-4">Manage Events</h2>
    {error && <div className="alert alert-danger" role="alert">{error} <button className="btn btn-sm btn-outline-danger" onClick={() => setRevision((n) => n + 1)}>Retry</button></div>}
    {message && <div className="alert alert-success" role="status">{message}</div>}
    <form onSubmit={save} className="border rounded p-3 mb-4">
      <h3 className="h5">{editingId ? "Edit event" : "Schedule New Event"}</h3>
      <div className="row g-3">
        {[["title", "Event title", "text"], ["event_date", "Event date", "date"], ["start_time", "Start time", "time"], ["end_time", "End time (optional)", "time"], ["location", "Location", "text"], ["capacity", "Capacity (blank for unlimited)", "number"]].map(([key, label, type]) => <div className="col-sm-6" key={key}>
          <label className="form-label" htmlFor={`event-${key}`}>{label}</label><input id={`event-${key}`} className="form-control" type={type} value={form[key]} min={type === "number" ? 0 : undefined} maxLength={type === "text" ? 255 : undefined} required={!["end_time", "capacity"].includes(key)} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        </div>)}
        <div className="col-12"><label className="form-label" htmlFor="event-category">Category</label><select id="event-category" className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((value) => <option key={value}>{value}</option>)}</select></div>
        <div className="col-12"><label className="form-label" htmlFor="event-description">Description</label><textarea id="event-description" className="form-control" maxLength={10000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="col-12"><label className="form-check"><input className="form-check-input" type="checkbox" checked={form.registration_required} onChange={(e) => setForm({ ...form, registration_required: e.target.checked })} />Registration required</label></div>
      </div>
      <div className="d-flex gap-2 mt-3"><button className="btn btn-mc" disabled={busy}>{busy ? "Saving..." : editingId ? "Save event" : "Create draft"}</button>{editingId && <button type="button" className="btn btn-outline-mc" onClick={() => { setEditingId(null); setForm(empty); }}>Cancel editing</button>}</div>
    </form>
    {loading ? <p role="status">Loading events...</p> : events.length === 0 ? <p>No events scheduled.</p> : events.map((event) => <article key={event.id} className="border rounded p-3 mb-3">
      <h3 className="h5">{event.title}</h3><p>{event.event_date} · {event.start_time} · {event.status}</p>
      <p className="small text-muted">{event.registrations_count || 0} registrations</p>
      <div className="d-flex flex-wrap gap-2">
        {["draft", "published"].includes(event.status) && <button className="btn btn-sm btn-outline-mc" disabled={busy} onClick={() => { setEditingId(event.id); setForm(Object.fromEntries(Object.keys(empty).map((key) => [key, event[key] ?? empty[key]]))); }}>Edit</button>}
        {event.status === "draft" && <button className="btn btn-sm btn-mc" disabled={busy} onClick={() => mutate(`${base}/${event.id}/publish`, "PATCH", undefined, "Event published.")}>Publish</button>}
        {event.status === "published" && <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => mutate(`${base}/${event.id}/cancel`, "PATCH", undefined, "Event cancelled.")}>Cancel event</button>}
        {event.status === "draft" && <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => mutate(`${base}/${event.id}`, "DELETE", undefined, "Draft deleted.")}>Delete draft</button>}
      </div>
    </article>)}
    {lastPage > 1 && <div className="d-flex gap-3 align-items-center"><button className="btn btn-outline-mc" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {lastPage}</span><button className="btn btn-outline-mc" disabled={page === lastPage} onClick={() => setPage(page + 1)}>Next</button></div>}
  </section>;
}
