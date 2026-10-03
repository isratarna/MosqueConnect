import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  EyeOff,
  Megaphone,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";
import { formatApiDate } from "../utils/intl";
import { useLocale } from "../hooks/useLocale";



export default function MosqueAdminAnnouncements() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const selectedMosque = user?.managed_mosques?.find((item) => String(item.id) === params.get("mosque")) || user?.managed_mosques?.[0];

  const [loading, setLoading] = useState(true);
  const [mosque, setMosque] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submittingForm, setSubmittingForm] = useState(false);
  
  // Form Fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgency, setUrgency] = useState("low");
  const [status, setStatus] = useState("published");

  // Feedback
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [revision, setRevision] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const managed = selectedMosque;
    if (!managed) { setActionError(t("admin.announcements.noMosque")); setLoading(false); return; }
    const controller = new AbortController();
    setMosque(managed);
    setLoading(true);
    setActionError("");
    apiRequest(`/api/admin/mosques/${managed.id}/announcements`, { signal: controller.signal })
      .then(({ data }) => setAnnouncements(data))
      .catch((err) => { if (err.name !== "AbortError") setActionError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, selectedMosque?.id, revision]);

  const showSuccess = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 3000);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setUrgency("low");
    setStatus("published");
    setShowForm(true);
  };

  const handleOpenEdit = (announce) => {
    setEditingId(announce.id);
    setTitle(announce.title);
    setBody(announce.body);
    setUrgency(announce.urgency || "low");
    setStatus(announce.status || "published");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mosque || submittingForm) return;
    setSubmittingForm(true);
    setActionError("");
    try {
      const { data } = await apiRequest(`/api/admin/mosques/${mosque.id}/announcements${editingId ? "/" + editingId : ""}`, {
        method: editingId ? "PATCH" : "POST", body: { title, body, urgency, status },
      });
      setAnnouncements((items) => editingId ? items.map((item) => item.id === editingId ? data : item) : [data, ...items]);
      showSuccess(editingId ? t("admin.announcements.updated") : t("admin.announcements.created"));
      setShowForm(false);
    } catch (err) { setActionError(err.message); }
    finally { setSubmittingForm(false); }
  };

  const handleToggleStatus = async (id) => {
    if (actionBusy) return;
    setActionBusy(true);
    setActionError("");
    const item = announcements.find((entry) => entry.id === id);
    try {
      const { data } = await apiRequest(`/api/admin/mosques/${mosque.id}/announcements/${id}/${item.status === "published" ? "unpublish" : "publish"}`, { method: "PATCH" });
      setAnnouncements((items) => items.map((entry) => entry.id === id ? data : entry));
      showSuccess(t("admin.announcements.statusUpdated"));
    } catch (err) { setActionError(err.message); }
    finally { setActionBusy(false); }
  };

  const confirmDelete = (id) => setDeletingId(id);
  const executeDelete = async () => {
    if (!deletingId || actionBusy) return;
    setActionBusy(true);
    setActionError("");
    try {
      await apiRequest(`/api/admin/mosques/${mosque.id}/announcements/${deletingId}`, { method: "DELETE" });
      setAnnouncements((items) => items.filter((item) => item.id !== deletingId));
      setDeletingId(null);
      showSuccess(t("admin.announcements.deleted"));
    } catch (err) { setActionError(err.message); }
    finally { setActionBusy(false); }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: "80vh" }}>
        <div className="spinner-border text-mc" role="status">
          <span className="visually-hidden">{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 py-lg-5 mc-motion-section" style={{ maxWidth: "1000px", minHeight: "85vh" }}>
      
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3 border-bottom pb-3">
        <div>
          <Link to="/admin/dashboard" className="text-secondary small fw-bold text-decoration-none d-flex align-items-center gap-1 mb-2">
            <ArrowLeft size={14} /> {t("admin.announcements.back")}
          </Link>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <Megaphone size={28} className="text-mc" />
            {t("admin.announcements.title")}
          </h2>
          <p className="text-muted mb-0 small">{t("admin.announcements.subtitle")}</p>
        </div>
        <button 
          className="btn btn-mc d-flex align-items-center gap-2"
          onClick={showForm && !editingId ? () => setShowForm(false) : handleOpenCreate}
        >
          {showForm && !editingId ? t("admin.announcements.cancelCreation") : <><Plus size={18} /> {t("admin.announcements.newAnnouncement")}</>}
        </button>
      </div>

      {actionError && <div className="alert alert-danger" role="alert">{actionError} <button className="btn btn-sm btn-outline-danger" onClick={() => setRevision((n) => n + 1)}>{t("common.retry")}</button></div>}
      {actionSuccess && (
        <div className="alert alert-success py-2 px-3 mb-4 d-flex align-items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card border-0 shadow-sm mb-5 border-top border-4 border-mc bg-light">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start mb-4">
              <h5 className="fw-bold mb-0">{editingId ? t("admin.announcements.editTitle") : t("admin.announcements.createTitle")}</h5>
              <button className="btn-close" onClick={() => setShowForm(false)} aria-label={t("admin.announcements.closeForm")}></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-12 mb-3">
                  <label className="form-label fw-semibold small">{t("admin.announcements.titleLabel")} <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" placeholder={t("admin.announcements.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label fw-semibold small">{t("admin.announcements.message")} <span className="text-danger">*</span></label>
                  <textarea className="form-control" rows="4" placeholder={t("admin.announcements.messagePlaceholder")} value={body} onChange={(e) => setBody(e.target.value)} required></textarea>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold small">{t("admin.announcements.priority")}</label>
                  <select className="form-select" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                    <option value="low">{t("admin.announcements.priorityLow")}</option>
                    <option value="medium">{t("admin.announcements.priorityMedium")}</option>
                    <option value="high">{t("admin.announcements.priorityHigh")}</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold small">{t("admin.announcements.status")}</label>
                  <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="published">{t("admin.announcements.statusPublished")}</option>
                    <option value="draft">{t("admin.announcements.statusDraft")}</option>
                  </select>
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-2">
                <button type="button" className="btn btn-light border" onClick={() => setShowForm(false)} disabled={submittingForm}>{t("common.cancel")}</button>
                <button type="submit" className="btn btn-mc d-flex align-items-center gap-2" disabled={submittingForm}>
                  {submittingForm ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <CheckCircle size={16} />}
                  {submittingForm ? t("admin.announcements.saving") : editingId ? t("admin.announcements.saveChanges") : t("admin.announcements.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Simulated via overlay) */}
      {deletingId && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                    <AlertCircle size={22} /> {t("admin.announcements.deleteTitle")}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setDeletingId(null)} aria-label={t("common.close")}></button>
                </div>
                <div className="modal-body py-4">
                  <p className="mb-0">{t("admin.announcements.deleteBody")}</p>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light border" onClick={() => setDeletingId(null)}>{t("common.cancel")}</button>
                  <button type="button" className="btn btn-danger" onClick={executeDelete}>{t("admin.announcements.deleteYes")}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="text-center py-5 text-muted border rounded shadow-sm bg-white mt-4">
          <Megaphone size={48} className="mb-3 opacity-25 mx-auto" />
          <h5 className="fw-bold">{t("admin.announcements.emptyTitle")}</h5>
          <p className="mb-0">{t("admin.announcements.emptyCopy")}</p>
          <button className="btn btn-outline-mc mt-3" onClick={handleOpenCreate}>{t("admin.announcements.createFirst")}</button>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {announcements.map((announce) => (
            <div className={`card border-0 shadow-sm overflow-hidden border-start border-4 ${announce.status === 'published' ? 'border-success' : 'border-warning'}`} key={announce.id}>
              <div className="card-body p-4">
                <div className="row align-items-center gap-3 gap-md-0">
                  
                  <div className="col-md-9">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                      <h5 className="fw-bold mb-0 text-dark">{announce.title}</h5>
                      <span className={`badge ${announce.status === 'published' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-dark border border-warning-subtle'}`}>
                        {announce.status === 'published' ? t("status.published") : t("status.draft")}
                      </span>
                      {announce.urgency === 'high' && <span className="badge bg-danger">{t("urgency.urgent")}</span>}
                    </div>
                    
                    <p className="text-secondary small mb-3">{announce.body}</p>
                    
                    <div className="d-flex align-items-center gap-2 small text-muted">
                      <Clock size={14} /> <span>{t("admin.announcements.posted", { date: formatApiDate(announce.date, locale) })}</span>
                      {announce.urgency !== 'low' && (
                        <>
                          <span className="mx-1">•</span>
                          <span>{t("admin.announcements.priorityMeta", { level: t(`urgency.${announce.urgency}`, { defaultValue: announce.urgency }) })}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="col-md-3">
                    <div className="d-flex flex-md-column flex-row gap-2 justify-content-end align-items-stretch align-items-md-end h-100 mt-2 mt-md-0">
                      <button 
                        className={`btn btn-sm ${announce.status === 'published' ? 'btn-outline-warning' : 'btn-outline-success'} d-flex align-items-center justify-content-center gap-2 w-100`}
                        onClick={() => handleToggleStatus(announce.id)}
                      >
                        {announce.status === 'published' ? <><EyeOff size={14} /> {t("admin.announcements.unpublish")}</> : <><Eye size={14} /> {t("admin.announcements.publish")}</>}
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2 w-100"
                        onClick={() => handleOpenEdit(announce)}
                      >
                        <Edit size={14} /> {t("admin.announcements.edit")}
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center gap-2 w-100"
                        onClick={() => confirmDelete(announce.id)}
                      >
                        <Trash2 size={14} /> {t("admin.announcements.delete")}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
