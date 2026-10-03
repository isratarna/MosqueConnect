import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import { apiRequest } from "../../utils/api";
import { formatClockTime } from "../../utils/prayerTime";
import { BlockStack, SkeletonRegion } from "../skeletons";

const blankForm = { title: "", description: "", opportunity_date: "", start_time: "", end_time: "", location: "", volunteers_required: "", requirements: "" };
const STATUS_BADGE = { active: "bg-success", closed: "bg-warning text-dark", completed: "bg-secondary", cancelled: "bg-secondary" };

const toForm = (item) => ({
  title: item.title,
  description: item.description,
  opportunity_date: item.opportunity_date,
  start_time: item.start_time?.slice(0, 5) || "",
  end_time: item.end_time?.slice(0, 5) || "",
  location: item.location,
  volunteers_required: String(item.volunteers_required),
  requirements: item.requirements || "",
});

/** Dashboard section "Volunteer Work": post opportunities, edit them, see who signed up. */
export default function VolunteerManager({ mosqueId }) {
  const url = `/api/admin/mosques/${mosqueId}/volunteer-opportunities`;
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(null); // null, "new" or an opportunity id
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [applicants, setApplicants] = useState({}); // id -> list | "loading" | error string

  useEffect(() => {
    const controller = new AbortController();
    setItems(null);
    setLoadError("");
    apiRequest(url, { signal: controller.signal })
      .then(({ data }) => setItems(data))
      .catch((err) => { if (err.name !== "AbortError") setLoadError(err.message); });
    return () => controller.abort();
  }, [url, attempt]);

  const openForm = (item) => {
    setEditing(item ? item.id : "new");
    setForm(item ? toForm(item) : blankForm);
    setError("");
    setNotice("");
  };

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    const body = { ...form, start_time: form.start_time || null, end_time: form.end_time || null, volunteers_required: Number(form.volunteers_required), requirements: form.requirements || null };
    try {
      const { data } = editing === "new"
        ? await apiRequest(url, { method: "POST", body })
        : await apiRequest(`${url}/${editing}`, { method: "PATCH", body });
      setItems((list) => (editing === "new" ? [data, ...list] : list.map((item) => (item.id === data.id ? { ...item, ...data } : item))));
      setNotice(editing === "new" ? "Opportunity published." : "Opportunity updated.");
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item, status) {
    setError("");
    try {
      const { data } = await apiRequest(`${url}/${item.id}/status`, { method: "PATCH", body: { status } });
      setItems((list) => list.map((entry) => (entry.id === item.id ? { ...entry, ...data } : entry)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleApplicants(item) {
    if (applicants[item.id] && applicants[item.id] !== "loading") {
      setApplicants(({ [item.id]: _, ...rest }) => rest);
      return;
    }
    setApplicants((all) => ({ ...all, [item.id]: "loading" }));
    try {
      const { data } = await apiRequest(`${url}/${item.id}`);
      setApplicants((all) => ({ ...all, [item.id]: data.registrations || [] }));
    } catch (err) {
      setApplicants((all) => ({ ...all, [item.id]: err.message }));
    }
  }

  const field = (key) => ({ value: form[key], onChange: (e) => setForm((current) => ({ ...current, [key]: e.target.value })) });

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Volunteer Work</h2>
          <p className="text-muted small mb-0">Active opportunities appear on the public Volunteers page.</p>
        </div>
        {editing === null && <button type="button" className="btn btn-mc btn-sm" onClick={() => openForm(null)}><Plus size={16} aria-hidden="true" /> New opportunity</button>}
      </div>

      {notice && <div className="alert alert-success py-2" role="status">{notice}</div>}
      {error && editing === null && <div className="alert alert-danger" role="alert">{error}</div>}

      {editing !== null && (
        <form className="card border-0 bg-light mb-4" onSubmit={onSubmit}>
          <div className="card-body">
            <h3 className="h6 fw-bold mb-3">{editing === "new" ? "New volunteer opportunity" : "Edit opportunity"}</h3>
            {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label small fw-semibold" htmlFor="vol-title">Title</label>
                <input id="vol-title" className="form-control" maxLength={255} required placeholder="e.g. Traffic control for Eid" {...field("title")} />
              </div>
              <div className="col-md-4">
                <label className="form-label small fw-semibold" htmlFor="vol-needed">Volunteers needed</label>
                <input id="vol-needed" type="number" min="1" className="form-control" required {...field("volunteers_required")} />
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold" htmlFor="vol-description">Description</label>
                <textarea id="vol-description" className="form-control" rows={2} required {...field("description")} />
              </div>
              <div className="col-sm-6 col-md-3">
                <label className="form-label small fw-semibold" htmlFor="vol-date">Date</label>
                <input id="vol-date" type="date" className="form-control" required {...field("opportunity_date")} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small fw-semibold" htmlFor="vol-start">Start</label>
                <input id="vol-start" type="time" className="form-control" {...field("start_time")} />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label small fw-semibold" htmlFor="vol-end">End</label>
                <input id="vol-end" type="time" className="form-control" {...field("end_time")} />
              </div>
              <div className="col-sm-6 col-md-3">
                <label className="form-label small fw-semibold" htmlFor="vol-location">Where</label>
                <input id="vol-location" className="form-control" maxLength={255} required placeholder="e.g. Main gate" {...field("location")} />
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold" htmlFor="vol-requirements">Requirements (optional)</label>
                <textarea id="vol-requirements" className="form-control" rows={2} {...field("requirements")} />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-light border" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-mc" disabled={saving}>{saving ? "Saving…" : editing === "new" ? "Publish opportunity" : "Save changes"}</button>
            </div>
          </div>
        </form>
      )}

      {loadError ? (
        <div className="alert alert-danger" role="alert">{loadError} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => setAttempt((n) => n + 1)}>Retry</button></div>
      ) : items === null ? (
        <SkeletonRegion label="Loading opportunities…"><BlockStack heights={[90, 90]} /></SkeletonRegion>
      ) : items.length === 0 ? (
        <p className="text-muted">No volunteer opportunities yet.</p>
      ) : (
        <div className="d-grid gap-3">
          {items.map((item) => {
            const list = applicants[item.id];
            const open = ["active", "closed"].includes(item.status);
            return (
              <article key={item.id} className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
                    <h3 className="h6 fw-bold mb-0">{item.title}</h3>
                    <span className={`badge text-capitalize ${STATUS_BADGE[item.status] || "bg-secondary"}`}>{item.status}</span>
                  </div>
                  <p className="small text-secondary mb-2">{item.description}</p>
                  <div className="small text-muted d-flex flex-wrap gap-3 mb-2">
                    <span><CalendarDays size={14} aria-hidden="true" /> {item.opportunity_date}{item.start_time ? `, ${formatClockTime(item.start_time)}` : ""}</span>
                    <span><MapPin size={14} aria-hidden="true" /> {item.location}</span>
                    <span><Users size={14} aria-hidden="true" /> {item.registrations_count ?? 0} / {item.volunteers_required} signed up</span>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <button type="button" className="btn btn-sm btn-outline-mc" aria-expanded={Array.isArray(list)} onClick={() => toggleApplicants(item)}>{Array.isArray(list) ? "Hide volunteers" : "View volunteers"}</button>
                    {open && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openForm(item)}>Edit</button>}
                    {item.status === "active" && <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => changeStatus(item, "closed")}>Stop sign-ups</button>}
                    {item.status === "closed" && <button type="button" className="btn btn-sm btn-outline-success" onClick={() => changeStatus(item, "active")}>Reopen</button>}
                    {open && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => changeStatus(item, "completed")}>Mark completed</button>}
                  </div>
                  {list === "loading" && <SkeletonRegion label="Loading volunteers…" className="mt-2"><BlockStack heights={[32, 32]} /></SkeletonRegion>}
                  {typeof list === "string" && list !== "loading" && <p className="small text-danger mt-2 mb-0" role="alert">{list}</p>}
                  {Array.isArray(list) && (
                    list.length ? (
                      <ul className="list-group list-group-flush mt-2 small">
                        {list.map((entry) => (
                          <li key={entry.id} className="list-group-item px-0">
                            <strong>{entry.user?.name}</strong> · <a href={`tel:${entry.user?.phone}`}>{entry.user?.phone}</a> · signed up {new Date(entry.created_at).toLocaleDateString()}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="small text-muted mt-2 mb-0">Nobody has signed up yet.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
