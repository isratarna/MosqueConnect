import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  HeartHandshake,
  MapPin,
  Settings,
  Users
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";

export default function VolunteerOpportunities() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "mosque_admin" && user?.status === "approved";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  
  const [actionError, setActionError] = useState("");
  // Admins manage their own opportunities in the mosque dashboard.
  const managedMosqueIds = (user?.managed_mosques || []).map((item) => item.id);

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
      const [publicData, registrations] = await Promise.all([
        apiRequest("/api/volunteer-opportunities", { signal }),
        user ? apiRequest("/api/me/volunteer-registrations", { signal }) : Promise.resolve({ data: [] }),
      ]);
      setOpportunities(publicData.data.map((item) => normalize(item, registrations.data)));
    } catch (err) { if (err.name !== "AbortError") setError(err.message); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [user?.id]);

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
        {isAdmin && managedMosqueIds.length > 0 && (
          <Link to="/admin/dashboard?section=volunteers" className="btn btn-outline-mc d-flex align-items-center gap-2">
            <Settings size={18} aria-hidden="true" /> Manage your opportunities
          </Link>
        )}
      </div>

      {actionError && <div className="alert alert-danger" role="alert">{actionError}</div>}
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
            const canManage = isAdmin && managedMosqueIds.includes(opp.mosque_id);

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
                      {canManage && (
                        <Link to={`/admin/dashboard?section=volunteers&mosque=${opp.mosque_id}`} className="btn btn-sm btn-outline-mc">
                          Manage in dashboard
                        </Link>
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
