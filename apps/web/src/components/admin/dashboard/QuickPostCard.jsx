import { useState } from "react";
import { PenSquare } from "lucide-react";
import DashboardCard from "./DashboardCard";
import { ANNOUNCEMENT_TEMPLATES } from "../../../utils/dashboardFormat";
import { useLocale } from "../../../hooks/useLocale";
import { createAnnouncement } from "../../../utils/dashboardApi";

const empty = { title: "", body: "", urgency: "low" };

/** Compose an announcement without leaving the overview. */
export default function QuickPostCard({ mosqueId, mosqueName, onPosted }) {
  const { t } = useLocale();
  const [form, setForm] = useState(empty);
  const [template, setTemplate] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const pickTemplate = (id) => {
    setTemplate(id);
    // [Urmee · i18n dashboard] Templates are translated: the title and body come from the locale files ({{mosque}} is filled in).
    const known = ANNOUNCEMENT_TEMPLATES.find((item) => item.id === id);
    if (known) setForm({ title: t(`dashboard.templates.${id}.title`), urgency: known.urgency, body: t(`dashboard.templates.${id}.body`, { mosque: mosqueName || "—" }) });
  };

  const submit = async (status) => {
    if (busy || !form.title.trim() || !form.body.trim()) {
      if (!busy) setError(t("dashboard.quick.needText"));
      return;
    }
    setBusy(status);
    setError("");
    setMessage("");
    try {
      const created = await createAnnouncement(mosqueId, { ...form, status });
      setForm(empty);
      setTemplate("");
      setMessage(status === "published" ? t("dashboard.quick.published") : t("dashboard.quick.draftSaved"));
      onPosted?.(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <DashboardCard title={t("dashboard.quick.title")} icon={PenSquare}>
      <form onSubmit={(event) => { event.preventDefault(); submit("published"); }} noValidate>
        <div className="mb-2">
          <label className="form-label small fw-semibold" htmlFor="quick-template">{t("dashboard.quick.template")}</label>
          <select id="quick-template" className="form-select form-select-sm" value={template} onChange={(event) => pickTemplate(event.target.value)}>
            <option value="">{t("dashboard.quick.blank")}</option>
            {ANNOUNCEMENT_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{t(`dashboard.templates.${item.id}.label`)}</option>)}
          </select>
        </div>
        <div className="mb-2">
          <label className="form-label small fw-semibold" htmlFor="quick-title">{t("dashboard.quick.titleLabel")}</label>
          <input id="quick-title" className="form-control form-control-sm" maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
        </div>
        <div className="mb-2">
          <label className="form-label small fw-semibold" htmlFor="quick-body">{t("dashboard.quick.message")}</label>
          <textarea id="quick-body" className="form-control form-control-sm" rows={4} maxLength={10000} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required />
          {form.body.includes("[") && <div className="form-text">{t("dashboard.quick.brackets")}</div>}
        </div>
        <div className="mb-3">
          <label className="form-label small fw-semibold" htmlFor="quick-urgency">{t("dashboard.quick.urgency")}</label>
          <select id="quick-urgency" className="form-select form-select-sm" value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value })}>
            <option value="low">{t("dashboard.quick.low")}</option>
            <option value="medium">{t("dashboard.quick.medium")}</option>
            <option value="high">{t("dashboard.quick.high")}</option>
          </select>
        </div>
        {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
        {message && <div className="alert alert-success py-2 small" role="status">{message}</div>}
        <div className="d-flex flex-wrap gap-2">
          <button type="submit" className="btn btn-mc btn-sm" disabled={Boolean(busy)}>{busy === "published" ? t("dashboard.quick.publishing") : t("dashboard.quick.publish")}</button>
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={Boolean(busy)} onClick={() => submit("draft")}>{busy === "draft" ? t("dashboard.quick.saving") : t("dashboard.quick.saveDraft")}</button>
        </div>
      </form>
    </DashboardCard>
  );
}
