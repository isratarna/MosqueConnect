import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock, Edit, Eye, EyeOff, Megaphone, Plus, Trash2 } from "lucide-react";
import { AnnouncementStatusChip } from "./dashboard/AnnouncementsCard";
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAdminAnnouncements,
  setAnnouncementPublished,
  updateAnnouncement,
} from "../../utils/dashboardApi";
import { BlockStack, SkeletonRegion } from "../skeletons";
import ConfirmDialog from "../ConfirmDialog";

const emptyForm = { title: "", body: "", urgency: "low", status: "published" };

/** Dashboard section: create, edit, publish and delete the mosque's announcements. */
export default function AnnouncementManager({ mosqueId }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchAdminAnnouncements(mosqueId, { signal: controller.signal })
      .then(setAnnouncements)
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mosqueId, revision]);

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 3000);
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({ title: item.title, body: item.body, urgency: item.urgency || "low", status: item.status || "published" });
    setShowForm(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const saved = editingId ? await updateAnnouncement(mosqueId, editingId, form) : await createAnnouncement(mosqueId, form);
      setAnnouncements((items) => (editingId ? items.map((item) => (item.id === editingId ? saved : item)) : [saved, ...items]));
      showSuccess(editingId ? "Announcement updated." : form.status === "published" ? "Announcement published. Followers have been notified." : "Draft saved.");
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (item) => {
    if (actionBusy) return;
    setActionBusy(true);
    setError("");
    try {
      const updated = await setAnnouncementPublished(mosqueId, item.id, item.status !== "published");
      setAnnouncements((items) => items.map((entry) => (entry.id === item.id ? updated : entry)));
      showSuccess(updated.status === "published" ? "Announcement published." : "Announcement moved to drafts.");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const executeDelete = async () => {
    if (!deletingId || actionBusy) return;
    setActionBusy(true);
    setError("");
    try {
      await deleteAnnouncement(mosqueId, deletingId);
      setAnnouncements((items) => items.filter((item) => item.id !== deletingId));
      setDeletingId(null);
      showSuccess("Announcement deleted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Announcements</h2>
          <p className="text-muted small mb-0">Publish news, requests for goods and urgent notices. Followers are notified when you publish.</p>
        </div>
        <button type="button" className="btn btn-mc btn-sm" onClick={showForm && !editingId ? () => setShowForm(false) : openCreate}>
          {showForm && !editingId ? "Cancel" : <><Plus size={16} aria-hidden="true" /> New announcement</>}
        </button>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => setRevision((n) => n + 1)}>Retry</button></div>}
      {success && <div className="alert alert-success py-2 d-flex align-items-center gap-2" role="status"><CheckCircle size={18} aria-hidden="true" />{success}</div>}

      {showForm && (
        <form className="card border-0 bg-light mb-4" onSubmit={submit}>
          <div className="card-body">
            <h3 className="h6 fw-bold mb-3">{editingId ? "Edit announcement" : "New announcement"}</h3>
            <div className="mb-3">
              <label className="form-label small fw-semibold" htmlFor="announcement-title">Title</label>
              <input id="announcement-title" className="form-control" maxLength={255} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold" htmlFor="announcement-body">Message</label>
              <textarea id="announcement-body" className="form-control" rows={4} maxLength={10000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
            </div>
            <div className="row g-3 mb-3">
              <div className="col-sm-6">
                <label className="form-label small fw-semibold" htmlFor="announcement-urgency">Priority</label>
                <select id="announcement-urgency" className="form-select" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                  <option value="low">Low (general info)</option>
                  <option value="medium">Medium (warning / alert)</option>
                  <option value="high">High (urgent)</option>
                </select>
              </div>
              <div className="col-sm-6">
                <label className="form-label small fw-semibold" htmlFor="announcement-status">Status</label>
                <select id="announcement-status" className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="published">Published (visible to all)</option>
                  <option value="draft">Draft (hidden)</option>
                </select>
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light border" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</button>
              <button type="submit" className="btn btn-mc" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save changes" : "Create announcement"}</button>
            </div>
          </div>
        </form>
      )}

      {deletingId && (
        <ConfirmDialog
          title="Delete announcement?"
          message="This cannot be undone."
          confirmLabel="Yes, delete"
          tone="danger"
          onConfirm={executeDelete}
          onClose={() => setDeletingId(null)}
        />
      )}

      {loading ? (
        <SkeletonRegion label="Loading announcements…"><BlockStack heights={[88, 88, 88]} /></SkeletonRegion>
      ) : announcements.length === 0 ? (
        <div className="text-center py-5 text-muted border rounded">
          <Megaphone size={40} className="mb-2 opacity-25" aria-hidden="true" />
          <p className="mb-2">You haven't posted any announcements yet.</p>
          <button type="button" className="btn btn-outline-mc btn-sm" onClick={openCreate}>Create your first</button>
        </div>
      ) : (
        <div className="d-grid gap-3">
          {announcements.map((item) => (
            <article className={`card border-0 shadow-sm border-start border-4 ${item.status === "published" ? "border-success" : "border-warning"}`} key={item.id}>
              <div className="card-body d-flex flex-column flex-md-row gap-3">
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <h3 className="h6 fw-bold mb-0">{item.title}</h3>
                    <AnnouncementStatusChip status={item.status} />
                    {item.urgency === "high" && <span className="badge bg-danger">Urgent</span>}
                  </div>
                  <p className="text-secondary small mb-2">{item.body}</p>
                  <div className="small text-muted d-flex align-items-center gap-1"><Clock size={14} aria-hidden="true" /> {item.date ? `Published ${item.date}` : "Not published"}</div>
                </div>
                <div className="d-flex flex-md-column gap-2 flex-shrink-0">
                  <button type="button" className={`btn btn-sm ${item.status === "published" ? "btn-outline-warning" : "btn-outline-success"}`} onClick={() => toggleStatus(item)} disabled={actionBusy}>
                    {item.status === "published" ? <><EyeOff size={14} aria-hidden="true" /> Unpublish</> : <><Eye size={14} aria-hidden="true" /> Publish</>}
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(item)}><Edit size={14} aria-hidden="true" /> Edit</button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeletingId(item.id)}><Trash2 size={14} aria-hidden="true" /> Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
