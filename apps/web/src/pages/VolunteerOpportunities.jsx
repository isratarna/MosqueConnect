import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  HeartHandshake,
  MapPin,
  Users,
  Plus
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";
import { formatApiDate, formatNumber } from "../utils/intl";
import { formatClockTime } from "../utils/prayerTime";
import { useLocale } from "../hooks/useLocale";

export default function VolunteerOpportunities() {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const isAdmin = user?.role === "mosque_admin" && user?.status === "approved";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  
  const [actionError, setActionError] = useState("");
  const managedMosqueId = (user?.managed_mosques?.find((item) => String(item.id) === params.get("mosque")) || user?.managed_mosques?.[0])?.id;
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [instructions, setInstructions] = useState("");

  const [editingOpp, setEditingOpp] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [editError, setEditError] = useState("");

  const [viewingApplicantsOpp, setViewingApplicantsOpp] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantsError, setApplicantsError] = useState("");

  const normalize = (item, registrations = []) => ({
    ...item, mosqueName: item.mosque?.name, date: item.opportunity_date,
    capacity: item.volunteers_required, instructions: item.requirements,
    participantCount: item.registrations_count || 0,
    hasApplied: registrations.some((entry) => entry.volunteer_opportunity_id === item.id),
  });

  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [publicData, ownData, registrations] = await Promise.all([
        apiRequest("/api/volunteer-opportunities", { signal }),
        isAdmin && managedMosqueId ? apiRequest(`/api/admin/mosques/${managedMosqueId}/volunteer-opportunities`, { signal }) : Promise.resolve({ data: [] }),
        user ? apiRequest("/api/me/volunteer-registrations", { signal }) : Promise.resolve({ data: [] }),
      ]);
      const items = new Map([...publicData.data, ...ownData.data].map((item) => [item.id, item]));
      setOpportunities([...items.values()].map((item) => normalize(item, registrations.data)));
    } catch (err) { if (err.name !== "AbortError") setError(err.message); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [user?.id, isAdmin, managedMosqueId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleApply = async (id) => {
    if (!user) { navigate("/login", { state: { from: "/volunteers" } }); return; }
    const opportunity = opportunities.find((item) => item.id === id);
    setActionError("");
    setOpportunities((items) => items.map((item) => item.id === id ? { ...item, isApplying: true } : item));
    try {
      await apiRequest(`/api/volunteer-opportunities/${id}/register`, { method: opportunity.hasApplied ? "DELETE" : "POST" });
      setOpportunities((items) => items.map((item) => item.id === id ? { ...item, hasApplied: !opportunity.hasApplied, participantCount: item.participantCount + (opportunity.hasApplied ? -1 : 1) } : item));
    } catch (err) { setActionError(err.message); }
    finally { setOpportunities((items) => items.map((item) => item.id === id ? { ...item, isApplying: false } : item)); }
  };

  const handleCloseOpportunity = async (id) => {
    const opportunity = opportunities.find((item) => item.id === id);
    setActionError("");
    setOpportunities((items) => items.map((item) => item.id === id ? { ...item, isUpdating: true } : item));
    try {
      const { data } = await apiRequest(`/api/admin/mosques/${opportunity.mosque_id}/volunteer-opportunities/${id}/status`, { method: "PATCH", body: { status: "completed" } });
      setOpportunities((items) => items.map((item) => item.id === id ? { ...item, ...normalize(data) } : item));
    } catch (err) { setActionError(err.message); }
    finally { setOpportunities((items) => items.map((item) => item.id === id ? { ...item, isUpdating: false } : item)); }
  };

  const handleCreateOpportunity = async (e) => {
    e.preventDefault();
    if (!isAdmin || !managedMosqueId || submittingForm) return;
    setSubmittingForm(true);
    setActionError("");
    try {
      const { data } = await apiRequest(`/api/admin/mosques/${managedMosqueId}/volunteer-opportunities`, { method: "POST", body: {
        title, description, opportunity_date: date, start_time: time, location,
        volunteers_required: Number(capacity), requirements: instructions,
      } });
      setOpportunities((items) => [normalize(data), ...items]);
      setFormSuccess(true);
      setTitle(""); setDescription(""); setDate(""); setTime(""); setLocation(""); setCapacity(""); setInstructions("");
    } catch (err) { setActionError(err.message); }
    finally { setSubmittingForm(false); }
  };

  const handleEditClick = (opp) => {
    setEditingOpp({
      ...opp,
      title: opp.title,
      description: opp.description,
      opportunity_date: opp.opportunity_date,
      start_time: opp.start_time || "",
      end_time: opp.end_time || "",
      location: opp.location,
      volunteers_required: opp.capacity,
      requirements: opp.instructions || "",
    });
    setEditSuccess(false);
    setEditError("");
  };

  const handleUpdateOpportunity = async (e) => {
    e.preventDefault();
    if (!isAdmin || submittingEdit) return;
    setSubmittingEdit(true);
    setEditError("");
    try {
      const { data } = await apiRequest(`/api/admin/mosques/${managedMosqueId}/volunteer-opportunities/${editingOpp.id}`, { 
        method: "PATCH", 
        body: {
          title: editingOpp.title, 
          description: editingOpp.description, 
          opportunity_date: editingOpp.opportunity_date, 
          start_time: editingOpp.start_time || null, 
          end_time: editingOpp.end_time || null, 
          location: editingOpp.location,
          volunteers_required: Number(editingOpp.volunteers_required), 
          requirements: editingOpp.requirements,
        } 
      });
      setOpportunities((items) => items.map((item) => item.id === editingOpp.id ? { ...item, ...normalize(data) } : item));
      setEditSuccess(true);
      setTimeout(() => setEditingOpp(null), 1500);
    } catch (err) { setEditError(err.message); }
    finally { setSubmittingEdit(false); }
  };

  const handleViewApplicants = async (opp) => {
    setViewingApplicantsOpp(opp);
    setApplicantsLoading(true);
    setApplicantsError("");
    setApplicants([]);
    try {
      const { data } = await apiRequest(`/api/admin/mosques/${managedMosqueId}/volunteer-opportunities/${opp.id}`);
      setApplicants(data.registrations || []);
    } catch (err) {
      setApplicantsError(err.message);
    } finally {
      setApplicantsLoading(false);
    }
  };

  return (
    <div className="container mc-page-narrow py-4 py-lg-5 mc-motion-section">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3 border-bottom pb-3">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <HeartHandshake size={28} className="text-mc" />
            {t("volunteer.title")}
          </h2>
          <p className="text-muted mb-0 small">{t("volunteer.subtitle")}</p>
        </div>
        {isAdmin && (
          <button 
            className="btn btn-mc d-flex align-items-center gap-2"
            onClick={() => { setFormSuccess(false); setShowForm(!showForm); }}
          >
            {showForm ? t("volunteer.cancelCreation") : <><Plus size={18} /> {t("volunteer.create")}</>}
          </button>
        )}
      </div>

      {actionError && <div className="alert alert-danger" role="alert">{actionError}</div>}
      {showForm && isAdmin && (
        <div className="card border-0 shadow-sm mb-5 border-top border-4 border-mc">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-4">{t("volunteer.postTitle")}</h5>
            {formSuccess ? (
              <div className="alert alert-success text-center py-4 mb-0">
                <CheckCircle size={40} className="mb-2 text-success mx-auto" />
                <h6 className="fw-bold">{t("volunteer.publishedTitle")}</h6>
                <p className="small mb-0 text-dark">{t("volunteer.publishedCopy")}</p>
              </div>
            ) : (
              <form onSubmit={handleCreateOpportunity}>
                <div className="row g-3">
                  <div className="col-md-8 mb-3">
                    <label className="form-label fw-semibold small">{t("volunteer.oppTitle")} <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" placeholder={t("volunteer.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold small">{t("volunteer.needed")} <span className="text-danger">*</span></label>
                    <input type="number" min="1" max="100" className="form-control" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label fw-semibold small">{t("volunteer.description")} <span className="text-danger">*</span></label>
                    <textarea className="form-control" rows="2" placeholder={t("volunteer.descriptionPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} required></textarea>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold small">{t("volunteer.date")} <span className="text-danger">*</span></label>
                    <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold small">{t("volunteer.startTime")} <span className="text-danger">*</span></label>
                    <input type="time" className="form-control" value={time} onChange={(e) => setTime(e.target.value)} required />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold small">{t("volunteer.location")} <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" placeholder={t("volunteer.locationPlaceholder")} value={location} onChange={(e) => setLocation(e.target.value)} required />
                  </div>
                  <div className="col-12 mb-4">
                    <label className="form-label fw-semibold small">{t("volunteer.requirements")}</label>
                    <textarea className="form-control" rows="2" placeholder={t("volunteer.requirementsPlaceholder")} value={instructions} onChange={(e) => setInstructions(e.target.value)}></textarea>
                  </div>
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-light border" onClick={() => setShowForm(false)} disabled={submittingForm}>{t("common.cancel")}</button>
                  <button type="submit" className="btn btn-mc d-flex align-items-center gap-2" disabled={submittingForm}>
                    {submittingForm ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <HeartHandshake size={16} />}
                    {submittingForm ? t("volunteer.publishing") : t("volunteer.publish")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="d-flex flex-column gap-3 placeholder-glow">
          {[1, 2, 3].map(i => (
            <div key={i} className="card border-0 shadow-sm p-4">
              <div className="placeholder col-6 bg-secondary rounded mb-3" style={{ height: "24px" }}></div>
              <div className="placeholder col-4 bg-secondary rounded mb-2 d-block"></div>
              <div className="placeholder col-3 bg-secondary rounded d-block"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="alert alert-warning text-center py-5 shadow-sm">
          <AlertCircle size={32} className="text-warning mb-3 mx-auto" />
          <h5 className="fw-bold">{t("volunteer.loadFailed")}</h5>
          <p>{error}</p>
          <button className="btn btn-warning mt-2" onClick={() => fetchData()}>{t("common.tryAgain")}</button>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-5 text-muted border rounded shadow-sm bg-white">
          <HeartHandshake size={48} className="mb-3 opacity-25 mx-auto" />
          <h5 className="fw-bold">{t("volunteer.emptyTitle")}</h5>
          <p className="mb-0">{t("volunteer.emptyCopy")}</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {opportunities.map(opp => {
            const hasApplied = opp.hasApplied;
            const isFilled = opp.participantCount >= opp.capacity;
            const isCompleted = opp.status === "completed";
            const isDisabled = !hasApplied && (isFilled || opp.status !== "active");
            const canManage = isAdmin && opp.mosque_id === managedMosqueId;

            return (
              <div className={`card border-0 shadow-sm overflow-hidden ${opp.status === "active" ? "border-start border-4 border-mc" : "opacity-75"}`} key={opp.id}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                    <h5 className="fw-bold mb-0 text-dark">{opp.title}</h5>
                    <div>
                      {opp.status === "active" && !isFilled && <span className="badge bg-success-subtle text-success border border-success-subtle">{t("status.active")}</span>}
                      {opp.status === "active" && isFilled && <span className="badge bg-warning-subtle text-warning border border-warning-subtle text-dark">{t("volunteer.filled")}</span>}
                      {isCompleted && <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">{t("status.completed")}</span>}
                    </div>
                  </div>
                  <h6 className="text-mc fw-semibold mb-3 small d-flex align-items-center gap-1">
                    <MapPin size={14} /> {opp.mosqueName}
                  </h6>
                  
                  <p className="text-secondary small mb-3">{opp.description}</p>
                  
                  {opp.instructions && (
                    <div className="bg-light p-3 rounded mb-3 small text-muted border-start border-3 border-secondary">
                      <strong className="d-block mb-1 text-dark">{t("volunteer.requirementsLabel")}</strong>
                      {opp.instructions}
                    </div>
                  )}

                  <div className="row g-2 mb-3">
                    <div className="col-sm-6 col-md-4">
                      <div className="d-flex align-items-center gap-2 small text-muted">
                        <Calendar size={16} /> <span>{formatApiDate(opp.date, locale)}</span>
                      </div>
                    </div>
                    <div className="col-sm-6 col-md-4">
                      <div className="d-flex align-items-center gap-2 small text-muted">
                        <Clock size={16} /> <span>{[opp.start_time, opp.end_time].filter(Boolean).map((value) => formatClockTime(value, locale)).join(" - ") || t("volunteer.contactMosque")}</span>
                      </div>
                    </div>
                    <div className="col-sm-6 col-md-4">
                      <div className="d-flex align-items-center gap-2 small fw-semibold text-dark">
                        <Users size={16} /> <span>{t("volunteer.volunteers", { applied: opp.participantCount, capacity: opp.capacity })}</span>
                      </div>
                    </div>
                  </div>

                  <hr className="my-3 opacity-10" />

                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      {canManage ? (
                        <div className="small text-muted fw-semibold">
                          {t("volunteer.adminView", { count: opp.participantCount })}
                        </div>
                      ) : (
                        <div className="small text-muted">
                          {hasApplied ? t("volunteer.thanks") : t("volunteer.signUp")}
                        </div>
                      )}
                    </div>
                    
                    <div className="d-flex gap-2">
                      {canManage && opp.status === "active" && (
                        <div className="d-flex flex-wrap gap-2">
                          <button 
                            className="btn btn-sm btn-outline-mc"
                            onClick={() => handleViewApplicants(opp)}
                          >
                            {t("volunteer.viewApplicants")}
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-mc"
                            onClick={() => handleEditClick(opp)}
                          >
                            {t("volunteer.edit")}
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleCloseOpportunity(opp.id)}
                            disabled={opp.isUpdating}
                          >
                            {opp.isUpdating ? t("volunteer.closing") : t("volunteer.close")}
                          </button>
                        </div>
                      )}
                      
                      {!canManage && (
                        <button 
                          className={`btn btn-sm d-flex align-items-center gap-2 fw-medium ${hasApplied ? "btn-success" : isDisabled ? "btn-light border text-muted" : "btn-mc"}`}
                          disabled={isDisabled || opp.isApplying}
                          onClick={() => handleApply(opp.id)}
                        >
                          {opp.isApplying ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : hasApplied ? (
                            <CheckCircle size={16} />
                          ) : (
                            <HeartHandshake size={16} />
                          )}
                          {hasApplied ? t("volunteer.cancelSignup") : isFilled ? t("volunteer.spotsFilled") : isCompleted ? t("status.completed") : t("volunteer.volunteerNow")}
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingOpp && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">{t("volunteer.editTitle")}</h5>
                <button type="button" className="btn-close" aria-label={t("common.close")} onClick={() => setEditingOpp(null)}></button>
              </div>
              <div className="modal-body">
                {editSuccess ? (
                  <div className="alert alert-success text-center py-4 mb-0">
                    <CheckCircle size={40} className="mb-2 text-success mx-auto" />
                    <h6 className="fw-bold">{t("volunteer.editSuccess")}</h6>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateOpportunity}>
                    {editError && <div className="alert alert-danger">{editError}</div>}
                    <div className="row g-3">
                      <div className="col-md-8">
                        <label className="form-label small fw-semibold">{t("volunteer.editField")} <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" value={editingOpp.title} onChange={(e) => setEditingOpp({...editingOpp, title: e.target.value})} required />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">{t("volunteer.needed")} <span className="text-danger">*</span></label>
                        <input type="number" className="form-control" value={editingOpp.volunteers_required} onChange={(e) => setEditingOpp({...editingOpp, volunteers_required: e.target.value})} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">{t("volunteer.description")} <span className="text-danger">*</span></label>
                        <textarea className="form-control" rows="2" value={editingOpp.description} onChange={(e) => setEditingOpp({...editingOpp, description: e.target.value})} required></textarea>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">{t("volunteer.date")} <span className="text-danger">*</span></label>
                        <input type="date" className="form-control" value={editingOpp.opportunity_date} onChange={(e) => setEditingOpp({...editingOpp, opportunity_date: e.target.value})} required />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">{t("volunteer.editStartTime")}</label>
                        <input type="time" className="form-control" value={editingOpp.start_time} onChange={(e) => setEditingOpp({...editingOpp, start_time: e.target.value})} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">{t("volunteer.location")} <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" value={editingOpp.location} onChange={(e) => setEditingOpp({...editingOpp, location: e.target.value})} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">{t("volunteer.editRequirements")}</label>
                        <textarea className="form-control" rows="2" value={editingOpp.requirements} onChange={(e) => setEditingOpp({...editingOpp, requirements: e.target.value})}></textarea>
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button type="button" className="btn btn-light border" onClick={() => setEditingOpp(null)} disabled={submittingEdit}>{t("common.cancel")}</button>
                      <button type="submit" className="btn btn-mc d-flex align-items-center gap-2" disabled={submittingEdit}>
                        {submittingEdit ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : null}
                        {submittingEdit ? t("volunteer.saving") : t("volunteer.saveChanges")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applicants Modal */}
      {viewingApplicantsOpp && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">{t("volunteer.applicantsTitle", { title: viewingApplicantsOpp.title })}</h5>
                <button type="button" className="btn-close" aria-label={t("common.close")} onClick={() => setViewingApplicantsOpp(null)}></button>
              </div>
              <div className="modal-body">
                {applicantsLoading ? (
                  <div className="d-flex flex-column gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="placeholder-glow">
                        <div className="placeholder bg-secondary rounded w-100" style={{ height: "60px" }}></div>
                      </div>
                    ))}
                  </div>
                ) : applicantsError ? (
                  <div className="alert alert-danger">{applicantsError}</div>
                ) : applicants.length === 0 ? (
                  <div className="text-center text-muted py-4">{t("volunteer.noApplicants")}</div>
                ) : (
                  <div className="list-group list-group-flush">
                    {applicants.map(app => (
                      <div key={app.id} className="list-group-item px-0 py-3">
                        <div className="fw-semibold text-dark">{app.user.name}</div>
                        <div className="small text-muted mt-1">
                          {t("volunteer.applicantMeta", { phone: app.user.phone, date: formatApiDate(app.created_at, locale) })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
