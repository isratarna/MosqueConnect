import { useState } from "react";
import { PenSquare } from "lucide-react";
import DashboardCard from "./DashboardCard";
import { ANNOUNCEMENT_TEMPLATES, applyTemplate } from "../../../utils/dashboardFormat";
import { createAnnouncement } from "../../../utils/dashboardApi";

const empty = { title: "", body: "", urgency: "low" };

/** Compose an announcement without leaving the overview. */
export default function QuickPostCard({ mosqueId, mosqueName, onPosted }) {
  const [form, setForm] = useState(empty);
  const [template, setTemplate] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const pickTemplate = (id) => {
    setTemplate(id);
    const filled = applyTemplate(id, mosqueName);
    if (filled) setForm(filled);
  };

  const submit = async (status) => {
    if (busy || !form.title.trim() || !form.body.trim()) {
      if (!busy) setError("Add a title and a message first.");
      return;
    }
    setBusy(status);
    setError("");
    setMessage("");
    try {
      const created = await createAnnouncement(mosqueId, { ...form, status });
      setForm(empty);
      setTemplate("");
      setMessage(status === "published" ? "Published. Your followers have been notified." : "Saved as a draft.");
      onPosted?.(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <DashboardCard title="Quick post" icon={PenSquare}>
      <form onSubmit={(event) => { event.preventDefault(); submit("published"); }} noValidate>
        <div className="mb-2">
          <label className="form-label small fw-semibold" htmlFor="quick-template">Start from a template (optional)</label>
          <select id="quick-template" className="form-select form-select-sm" value={template} onChange={(event) => pickTemplate(event.target.value)}>
            <option value="">Blank post</option>
            {ANNOUNCEMENT_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <div className="mb-2">
          <label className="form-label small fw-semibold" htmlFor="quick-title">Title</label>
          <input id="quick-title" className="form-control form-control-sm" maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
        </div>
        <div className="mb-2">
          <label className="form-label small fw-semibold" htmlFor="quick-body">Message</label>
          <textarea id="quick-body" className="form-control form-control-sm" rows={4} maxLength={10000} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required />
          {form.body.includes("[") && <div className="form-text">Replace the parts in [brackets] before publishing.</div>}
        </div>
        <div className="mb-3">
          <label className="form-label small fw-semibold" htmlFor="quick-urgency">Urgency</label>
          <select id="quick-urgency" className="form-select form-select-sm" value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value })}>
            <option value="low">Low – general info</option>
            <option value="medium">Medium – important</option>
            <option value="high">High – urgent</option>
          </select>
        </div>
        {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
        {message && <div className="alert alert-success py-2 small" role="status">{message}</div>}
        <div className="d-flex flex-wrap gap-2">
          <button type="submit" className="btn btn-mc btn-sm" disabled={Boolean(busy)}>{busy === "published" ? "Publishing…" : "Publish"}</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={Boolean(busy)} onClick={() => submit("draft")}>{busy === "draft" ? "Saving…" : "Save draft"}</button>
        </div>
      </form>
    </DashboardCard>
  );
}
