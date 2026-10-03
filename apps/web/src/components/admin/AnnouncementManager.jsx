import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, Edit, Eye, EyeOff, Megaphone, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { AnnouncementStatusChip } from "./dashboard/AnnouncementsCard";
import AnnouncementEditor from "./AnnouncementEditor";
import {
  deleteAnnouncement,
  fetchAdminAnnouncements,
  setAnnouncementPublished,
  updateAnnouncement,
} from "../../utils/dashboardApi";
import { ANNOUNCEMENT_CATEGORIES, announcementState } from "../../utils/announcementForm";
import { useLocale } from "../../hooks/useLocale";
import { BlockStack, SkeletonRegion } from "../skeletons";
import ConfirmDialog from "../ConfirmDialog";

const STATE_FILTERS = ["all", "draft", "scheduled", "published", "expired"];

/**
 * [Urmee · F9] Dashboard section: the mosque's announcements list. Create / edit now go through the shared
 * AnnouncementEditor (schedule, expiry, pin, image, category, janazah template, preview). The list shows
 * status chips (Draft / Scheduled for … / Published / Expired), filters by status and category, and lets the
 * admin pin / unpin straight from a row.
 */
export default function AnnouncementManager({ mosqueId, mosqueName = "" }) {
  const { t } = useLocale();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState(null); // null = closed, { item } = open (item null for a new post)
  const [actionBusy, setActionBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

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

  const visible = useMemo(() => announcements.filter((item) => (
    (stateFilter === "all" || announcementState(item) === stateFilter)
    && (categoryFilter === "all" || item.category === categoryFilter)
  )), [announcements, stateFilter, categoryFilter]);

  const onSaved = (saved) => {
    const isEdit = Boolean(editor?.item);
    setAnnouncements((items) => (isEdit ? items.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...items]));
    setEditor(null);
    showSuccess(isEdit ? t("announcementEditor.updated") : saved.status === "scheduled" ? t("announcementEditor.scheduledOk") : saved.status === "published" ? t("announcementEditor.publishedOk") : t("announcementEditor.draftOk"));
  };

  // [Urmee · F9] Pin / unpin from the list. The API refuses a 4th pin with a field error, which is shown in the banner.
  const togglePin = async (item) => {
    if (actionBusy) return;
    setActionBusy(true);
    setError("");
    try {
      const updated = await updateAnnouncement(mosqueId, item.id, { is_pinned: !item.is_pinned });
      setAnnouncements((items) => items.map((entry) => (entry.id === item.id ? updated : entry)));
      showSuccess(updated.is_pinned ? t("announcementEditor.pinned") : t("announcementEditor.unpinned"));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionBusy(false);
    }
  };

  const toggleStatus = async (item) => {
    if (actionBusy) return;
    setActionBusy(true);
    setError("");
    try {
      const updated = await setAnnouncementPublished(mosqueId, item.id, item.status !== "published");
      setAnnouncements((items) => items.map((entry) => (entry.id === item.id ? updated : entry)));
      showSuccess(updated.status === "published" ? t("announcementEditor.publishedOk") : t("announcementEditor.movedToDrafts"));
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
      showSuccess(t("announcementEditor.deleted"));
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
          <h2 className="h4 mb-1">{t("announcementEditor.heading")}</h2>
          <p className="text-muted small mb-0">{t("announcementEditor.intro")}</p>
        </div>
        {!editor && <button type="button" className="btn btn-mc btn-sm" onClick={() => setEditor({ item: null })}><Plus size={16} aria-hidden="true" /> {t("announcementEditor.new")}</button>}
      </div>

      {error && <div className="alert alert-danger" role="alert">{error} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => setRevision((n) => n + 1)}>{t("common.retry")}</button></div>}
      {success && <div className="alert alert-success py-2 d-flex align-items-center gap-2" role="status"><CheckCircle size={18} aria-hidden="true" />{success}</div>}

      {editor && (
        <AnnouncementEditor
          key={editor.item?.id ?? "new"}
          mosqueId={mosqueId}
          mosqueName={mosqueName}
          announcement={editor.item}
          onSaved={onSaved}
          onCancel={() => setEditor(null)}
        />
      )}

      {deletingId && (
        <ConfirmDialog
          title={t("announcementEditor.deleteTitle")}
          message={t("announcementEditor.deleteMessage")}
          confirmLabel={t("announcementEditor.deleteConfirm")}
          tone="danger"
          onConfirm={executeDelete}
          onClose={() => setDeletingId(null)}
        />
      )}

      {!loading && announcements.length > 0 && (
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="btn-group btn-group-sm" role="group" aria-label={t("announcementEditor.filterStatus")}>
            {STATE_FILTERS.map((key) => (
              <button key={key} type="button" className={`btn ${stateFilter === key ? "btn-mc" : "btn-outline-mc"}`} aria-pressed={stateFilter === key} onClick={() => setStateFilter(key)}>
                {key === "all" ? t("announcementEditor.all") : t(`announcementEditor.state.${key}`)}
              </button>
            ))}
          </div>
          <select className="form-select form-select-sm w-auto" aria-label={t("announcementEditor.filterCategory")} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">{t("announcementEditor.allCategories")}</option>
            {ANNOUNCEMENT_CATEGORIES.map((key) => <option key={key} value={key}>{t(`announcement.categories.${key}`)}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <SkeletonRegion label={t("announcementEditor.loading")}><BlockStack heights={[88, 88, 88]} /></SkeletonRegion>
      ) : announcements.length === 0 ? (
        <div className="text-center py-5 text-muted border rounded">
          <Megaphone size={40} className="mb-2 opacity-25" aria-hidden="true" />
          <p className="mb-2">{t("announcementEditor.empty")}</p>
          <button type="button" className="btn btn-outline-mc btn-sm" onClick={() => setEditor({ item: null })}>{t("announcementEditor.createFirst")}</button>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-muted">{t("announcementEditor.noMatches")}</p>
      ) : (
        <div className="d-grid gap-3">
          {visible.map((item) => {
            const state = announcementState(item);
            return (
              <article className={`card border-0 shadow-sm border-start border-4 ${state === "published" ? "border-success" : state === "scheduled" ? "border-info" : state === "expired" ? "border-secondary" : "border-warning"}`} key={item.id}>
                <div className="card-body d-flex flex-column flex-md-row gap-3">
                  {item.image_url && <img src={item.image_url} alt={t("announcement.imageAlt", { title: item.title })} className="mc-announcement-thumb flex-shrink-0" />}
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                      <h3 className="h6 fw-bold mb-0">{item.title}</h3>
                      <AnnouncementStatusChip status={state} publishAt={item.publish_at} />
                      {item.is_pinned && <span className="badge text-bg-secondary"><Pin size={11} aria-hidden="true" /> {t("announcement.pinned")}</span>}
                      <span className="badge text-bg-light border">{t(`announcement.categories.${item.category || "general"}`)}</span>
                      {item.urgency === "high" && <span className="badge bg-danger">{t("announcementEditor.urgent")}</span>}
                    </div>
                    <p className="text-secondary small mb-2">{item.body}</p>
                    <div className="small text-muted d-flex align-items-center gap-1"><Clock size={14} aria-hidden="true" /> {item.date ? t("announcementEditor.publishedOn", { date: item.date }) : t("announcementEditor.notPublished")}</div>
                  </div>
                  <div className="d-flex flex-md-column gap-2 flex-shrink-0">
                    <button type="button" className={`btn btn-sm ${item.is_pinned ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => togglePin(item)} disabled={actionBusy} aria-pressed={item.is_pinned}>
                      {item.is_pinned ? <><PinOff size={14} aria-hidden="true" /> {t("announcementEditor.unpin")}</> : <><Pin size={14} aria-hidden="true" /> {t("announcementEditor.pin")}</>}
                    </button>
                    <button type="button" className={`btn btn-sm ${item.status === "published" ? "btn-outline-warning" : "btn-outline-success"}`} onClick={() => toggleStatus(item)} disabled={actionBusy}>
                      {item.status === "published" ? <><EyeOff size={14} aria-hidden="true" /> {t("announcementEditor.unpublish")}</> : <><Eye size={14} aria-hidden="true" /> {t("announcementEditor.publish")}</>}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setEditor({ item }); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Edit size={14} aria-hidden="true" /> {t("announcementEditor.edit")}</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeletingId(item.id)}><Trash2 size={14} aria-hidden="true" /> {t("announcementEditor.delete")}</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
