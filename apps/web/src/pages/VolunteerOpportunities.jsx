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

export default function VolunteerOpportunities() {
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

  const normalize = (item, registrations = []) => ({
    ...item, mosqueName: item.mosque?.name, date: item.opportunity_date,
    time: [item.start_time, item.end_time].filter(Boolean).join(" - ") || "Contact the mosque",
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

  return (
    <div className="container mc-page-narrow py-4 py-lg-5 mc-motion-section">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3 border-bottom pb-3">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <HeartHandshake size={28} className="text-mc" />
            Volunteer Opportunities
          </h2>
          <p className="text-muted mb-0 small">Give back to your community and earn rewards.</p>
        </div>
        {isAdmin && (
          <button 
            className="btn btn-mc d-flex align-items-center gap-2"
            onClick={() => { setFormSuccess(false); setShowForm(!showForm); }}
          >
            {showForm ? "Cancel Creation" : <><Plus size={18} /> Create Opportunity</>}
          </button>
        )}
      </div>

      {actionError && <div className="alert alert-danger" role="alert">{actionError}</div>}
      {showForm && isAdmin && (
        <div className="card border-0 shadow-sm mb-5 border-top border-4 border-mc">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-4">Post a Volunteer Opportunity</h5>
            {formSuccess ? (
              <div className="alert alert-success text-center py-4 mb-0">
                <CheckCircle size={40} className="mb-2 text-success mx-auto" />
                <h6 className="fw-bold">Opportunity Published!</h6>
                <p className="small mb-0 text-dark">Community members can now apply to participate.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateOpportunity}>
                <div className="row g-3">
                  <div className="col-md-8 mb-3">
                    <label className="form-label fw-semibold small">Opportunity Title <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" placeholder="e.g. Traffic Control for Eid" value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold small">Volunteers Needed <span className="text-danger">*</span></label>
                    <input type="number" min="1" max="100" className="form-control" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label fw-semibold small">Detailed Description <span className="text-danger">*</span></label>
                    <textarea className="form-control" rows="2" placeholder="Describe the roles and responsibilities..." value={description} onChange={(e) => setDescription(e.target.value)} required></textarea>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold small">Date <span className="text-danger">*</span></label>
                    <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold small">Start time <span className="text-danger">*</span></label>
                    <input type="time" className="form-control" value={time} onChange={(e) => setTime(e.target.value)} required />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold small">Specific Location <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" placeholder="e.g. Main Gate" value={location} onChange={(e) => setLocation(e.target.value)} required />
                  </div>
                  <div className="col-12 mb-4">
                    <label className="form-label fw-semibold small">Instructions / Requirements (Optional)</label>
                    <textarea className="form-control" rows="2" placeholder="e.g. Must be over 18, wear modest clothing..." value={instructions} onChange={(e) => setInstructions(e.target.value)}></textarea>
                  </div>
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-light border" onClick={() => setShowForm(false)} disabled={submittingForm}>Cancel</button>
                  <button type="submit" className="btn btn-mc d-flex align-items-center gap-2" disabled={submittingForm}>
                    {submittingForm ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <HeartHandshake size={16} />}
                    {submittingForm ? "Publishing..." : "Publish Opportunity"}
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
          <h5 className="fw-bold">Failed to load opportunities</h5>
          <p>{error}</p>
          <button className="btn btn-warning mt-2" onClick={() => fetchData()}>Try Again</button>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="text-center py-5 text-muted border rounded shadow-sm bg-white">
          <HeartHandshake size={48} className="mb-3 opacity-25 mx-auto" />
          <h5 className="fw-bold">No Active Opportunities</h5>
          <p className="mb-0">There are no volunteer requests available at the moment. Check back later!</p>
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
                      {opp.status === "active" && !isFilled && <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>}
                      {opp.status === "active" && isFilled && <span className="badge bg-warning-subtle text-warning border border-warning-subtle text-dark">Filled</span>}
                      {isCompleted && <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Completed</span>}
                    </div>
                  </div>
                  <h6 className="text-mc fw-semibold mb-3 small d-flex align-items-center gap-1">
                    <MapPin size={14} /> {opp.mosqueName}
                  </h6>
                  
                  <p className="text-secondary small mb-3">{opp.description}</p>
                  
                  {opp.instructions && (
                    <div className="bg-light p-3 rounded mb-3 small text-muted border-start border-3 border-secondary">
                      <strong className="d-block mb-1 text-dark">Requirements/Instructions:</strong>
                      {opp.instructions}
                    </div>
                  )}

                  <div className="row g-2 mb-3">
                    <div className="col-sm-6 col-md-4">
                      <div className="d-flex align-items-center gap-2 small text-muted">
                        <Calendar size={16} /> <span>{opp.date}</span>
                      </div>
                    </div>
                    <div className="col-sm-6 col-md-4">
                      <div className="d-flex align-items-center gap-2 small text-muted">
                        <Clock size={16} /> <span>{opp.time}</span>
                      </div>
                    </div>
                    <div className="col-sm-6 col-md-4">
                      <div className="d-flex align-items-center gap-2 small fw-semibold text-dark">
                        <Users size={16} /> <span>{opp.participantCount} / {opp.capacity} Volunteers</span>
                      </div>
                    </div>
                  </div>

                  <hr className="my-3 opacity-10" />

                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      {canManage ? (
                        <div className="small text-muted fw-semibold">
                          Admin View: {opp.participantCount} Applications
                        </div>
                      ) : (
                        <div className="small text-muted">
                          {hasApplied ? "Jazakallah Khair for participating!" : "Sign up to help your community."}
                        </div>
                      )}
                    </div>
                    
                    <div className="d-flex gap-2">
                      {canManage && opp.status === "active" && (
                        <button 
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleCloseOpportunity(opp.id)}
                          disabled={opp.isUpdating}
                        >
                          {opp.isUpdating ? "Closing..." : "Mark as Completed"}
                        </button>
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
                          {hasApplied ? "Cancel signup" : isFilled ? "Spots Filled" : isCompleted ? "Completed" : "Volunteer Now"}
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
    </div>
  );
}
