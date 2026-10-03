import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Pin } from "lucide-react";
import { useLocale } from "../../hooks/useLocale";
import { createAnnouncement, setAnnouncementPublished, updateAnnouncement } from "../../utils/dashboardApi";
import { ANNOUNCEMENT_CATEGORIES, buildAnnouncementFormData, formFromAnnouncement, janazahBody } from "../../utils/announcementForm";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // the API rejects images over 4 MB

/**
 * [Urmee · F9] Live preview of the announcement as visitors will see it on the mosque page. Janazah notices
 * get the same calm, distinct styling here as on the public pages (.mc-announcement--janazah).
 */
function AnnouncementPreview({ form, imageUrl }) {
  const { t } = useLocale();
  const janazah = form.category === "janazah";
  return (
    <div className={`mc-announcement-preview ${janazah ? "mc-announcement--janazah" : ""}`} aria-label={t("announcementEditor.previewTitle")}>
      {imageUrl && <img src={imageUrl} alt={t("announcement.imageAlt", { title: form.title || t("announcementEditor.untitled") })} className="mc-announcement-image mb-2" />}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
        <strong>{form.title || t("announcementEditor.untitled")}</strong>
        {form.is_pinned && <span className="badge text-bg-secondary"><Pin size={11} aria-hidden="true" /> {t("announcement.pinned")}</span>}
        <span className="badge text-bg-light border">{t(`announcement.categories.${form.category}`)}</span>
      </div>
      <p className="small mb-0" style={{ whiteSpace: "pre-wrap" }}>{form.body || t("announcementEditor.previewEmpty")}</p>
    </div>
  );
}

/**
 * [Urmee · F9] The one editor for a mosque announcement: title, category (with a janazah template), message,
 * priority, image with preview, publish now / schedule (Dhaka time) / draft, "hide after" expiry, pin switch
 * and a live preview. The dashboard's AnnouncementManager embeds it; `announcement` is null for a new post.
 * Server errors (e.g. "at most 3 pinned") are shown next to the field they belong to.
 */
export default function AnnouncementEditor({ mosqueId, mosqueName = "", announcement = null, onSaved, onCancel }) {
  const { t } = useLocale();
  const [form, setForm] = useState(() => formFromAnnouncement(announcement));
  const [janazah, setJanazah] = useState({ name: "", time: "", place: "" });
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");

  // Local preview of a freshly picked file; released when it changes or the editor closes.
  const pickedUrl = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);
  useEffect(() => () => { if (pickedUrl) URL.revokeObjectURL(pickedUrl); }, [pickedUrl]);
  const imageUrl = pickedUrl || announcement?.image_url || "";

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));

  const pickCategory = (event) => {
    const category = event.target.value;
    setForm((current) => ({
      ...current,
      category,
      // Janazah is urgent by default (the API does the same) and starts with a respectful title.
      urgency: category === "janazah" ? "high" : current.urgency,
      title: category === "janazah" && !current.title ? t("announcementEditor.janazahTitle") : current.title,
      body: category === "janazah" && !current.body ? janazahBody(janazah, mosqueName) : current.body,
    }));
  };

  const setJanazahField = (field) => (event) => {
    const next = { ...janazah, [field]: event.target.value };
    setJanazah(next);
    setForm((current) => ({ ...current, body: janazahBody(next, mosqueName) })); // the template rewrites the message as the details are typed
  };

  const pickImage = (event) => {
    const file = event.target.files?.[0];
    setImageError("");
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setImageError(t("announcementEditor.imageType")); return; }
    if (file.size > MAX_IMAGE_BYTES) { setImageError(t("announcementEditor.imageSize")); return; }
    setImage(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFieldErrors({});
    setFormError("");
    try {
      const body = buildAnnouncementFormData(form, { image });
      let saved = announcement ? await updateAnnouncement(mosqueId, announcement.id, body) : await createAnnouncement(mosqueId, body);
      // An already-scheduled post switched to "publish now": the API keeps its future publish_at on update, so use its publish action.
      // Likewise "save as draft" on a scheduled post: unpublish clears its publish_at and makes it a plain draft.
      if (announcement?.status === "scheduled" && form.mode === "now") saved = await setAnnouncementPublished(mosqueId, announcement.id, true);
      if (announcement?.status === "scheduled" && form.mode === "draft") saved = await setAnnouncementPublished(mosqueId, announcement.id, false);
      onSaved(saved);
    } catch (error) {
      setFieldErrors(error.errors || {});
      setFormError(error.errors && Object.keys(error.errors).length ? "" : error.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (name) => fieldErrors[name] && <div className="invalid-feedback d-block">{fieldErrors[name][0]}</div>;
  const invalid = (name) => (fieldErrors[name] ? "is-invalid" : "");

  return (
    <form className="card border-0 bg-body-tertiary mb-4" onSubmit={submit}>
      <div className="card-body">
        <h3 className="h6 fw-bold mb-3">{announcement ? t("announcementEditor.editTitle") : t("announcementEditor.newTitle")}</h3>
        {formError && <div className="alert alert-danger py-2 small" role="alert">{formError}</div>}

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small fw-semibold" htmlFor="ann-category">{t("announcementEditor.category")}</label>
            <select id="ann-category" className="form-select" value={form.category} onChange={pickCategory}>
              {ANNOUNCEMENT_CATEGORIES.map((key) => <option key={key} value={key}>{t(`announcement.categories.${key}`)}</option>)}
            </select>
            {fieldError("category")}
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold" htmlFor="ann-urgency">{t("announcementEditor.priority")}</label>
            <select id="ann-urgency" className="form-select" value={form.urgency} onChange={set("urgency")}>
              <option value="low">{t("announcementEditor.urgencyLow")}</option>
              <option value="medium">{t("announcementEditor.urgencyMedium")}</option>
              <option value="high">{t("announcementEditor.urgencyHigh")}</option>
            </select>
            {fieldError("urgency")}
          </div>

          {form.category === "janazah" && (
            <fieldset className="col-12 border rounded p-3 mc-announcement--janazah">
              <legend className="small fw-semibold float-none w-auto px-2 mb-0">{t("announcementEditor.janazahTemplate")}</legend>
              <p className="small text-muted">{t("announcementEditor.janazahHelp")}</p>
              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label small" htmlFor="ann-jz-name">{t("announcementEditor.janazahName")}</label>
                  <input id="ann-jz-name" className="form-control" value={janazah.name} onChange={setJanazahField("name")} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small" htmlFor="ann-jz-time">{t("announcementEditor.janazahTime")}</label>
                  <input id="ann-jz-time" className="form-control" placeholder={t("announcementEditor.janazahTimePlaceholder")} value={janazah.time} onChange={setJanazahField("time")} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small" htmlFor="ann-jz-place">{t("announcementEditor.janazahPlace")}</label>
                  <input id="ann-jz-place" className="form-control" placeholder={mosqueName} value={janazah.place} onChange={setJanazahField("place")} />
                </div>
              </div>
            </fieldset>
          )}

          <div className="col-12">
            <label className="form-label small fw-semibold" htmlFor="ann-title">{t("announcementEditor.title")}</label>
            <input id="ann-title" className={`form-control ${invalid("title")}`} maxLength={255} required value={form.title} onChange={set("title")} />
            {fieldError("title")}
          </div>
          <div className="col-12">
            <label className="form-label small fw-semibold" htmlFor="ann-body">{t("announcementEditor.message")}</label>
            <textarea id="ann-body" className={`form-control ${invalid("body")}`} rows={4} maxLength={10000} required value={form.body} onChange={set("body")} />
            {fieldError("body")}
          </div>

          <div className="col-12">
            <label className="form-label small fw-semibold" htmlFor="ann-image"><ImagePlus size={14} aria-hidden="true" /> {t("announcementEditor.image")}</label>
            <input id="ann-image" type="file" accept="image/jpeg,image/png,image/webp" className={`form-control ${imageError || fieldErrors.image ? "is-invalid" : ""}`} onChange={pickImage} />
            <div className="form-text">{t("announcementEditor.imageHelp")}</div>
            {imageError && <div className="invalid-feedback d-block">{imageError}</div>}
            {fieldError("image")}
          </div>

          <fieldset className="col-12">
            <legend className="form-label small fw-semibold">{t("announcementEditor.when")}</legend>
            <div className="d-flex flex-wrap gap-3">
              {[["now", t("announcementEditor.publishNow")], ["schedule", t("announcementEditor.schedule")], ["draft", t("announcementEditor.draft")]].map(([value, label]) => (
                <div className="form-check" key={value}>
                  <input id={`ann-mode-${value}`} className="form-check-input" type="radio" name="ann-mode" value={value} checked={form.mode === value} onChange={set("mode")} />
                  <label className="form-check-label" htmlFor={`ann-mode-${value}`}>{label}</label>
                </div>
              ))}
            </div>
          </fieldset>

          {form.mode === "schedule" && (
            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="ann-publish-at">{t("announcementEditor.publishAt")}</label>
              <input id="ann-publish-at" type="datetime-local" className={`form-control ${invalid("publish_at")}`} required value={form.publish_at} onChange={set("publish_at")} />
              <div className="form-text">{t("announcementEditor.dhakaTime")}</div>
              {fieldError("publish_at")}
            </div>
          )}
          <div className="col-md-6">
            <label className="form-label small fw-semibold" htmlFor="ann-expires-at">{t("announcementEditor.expiresAt")}</label>
            <input id="ann-expires-at" type="datetime-local" className={`form-control ${invalid("expires_at")}`} min={form.mode === "schedule" ? form.publish_at || undefined : undefined} value={form.expires_at} onChange={set("expires_at")} />
            <div className="form-text">{t("announcementEditor.expiresHelp")}</div>
            {fieldError("expires_at")}
          </div>

          <div className="col-12">
            <div className="form-check form-switch">
              <input id="ann-pinned" className="form-check-input" type="checkbox" role="switch" checked={form.is_pinned} onChange={set("is_pinned")} />
              <label className="form-check-label" htmlFor="ann-pinned">{t("announcementEditor.pin")}</label>
            </div>
            <div className="form-text">{t("announcementEditor.pinHelp")}</div>
            {fieldError("is_pinned")}
          </div>

          <div className="col-12">
            <p className="small fw-semibold mb-1">{t("announcementEditor.previewTitle")}</p>
            <AnnouncementPreview form={form} imageUrl={imageUrl} />
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <button type="button" className="btn btn-light border" onClick={onCancel} disabled={saving}>{t("common.cancel")}</button>
          <button type="submit" className="btn btn-mc" disabled={saving}>{saving ? t("schedule.saving") : t(form.mode === "draft" ? "announcementEditor.saveDraft" : form.mode === "schedule" ? "announcementEditor.saveSchedule" : "announcementEditor.savePublish")}</button>
        </div>
      </div>
    </form>
  );
}
