import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Droplet,
  Heart,
  MapPin,
  Phone,
  Plus
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";

export default function BloodDonation() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);
  
  const [actionError, setActionError] = useState("");
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Form Fields
  const [bloodGroup, setBloodGroup] = useState("");
  const [units, setUnits] = useState("");
  const [hospital, setHospital] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");

  const normalize = (item, responses = []) => ({
    ...item, group: item.blood_group, hospital: item.hospital_or_location,
    date: item.required_date, phone: item.contact_phone, details: item.notes,
    urgent: item.urgency === "high" || item.urgency === "critical",
    hasResponded: responses.some((response) => response.blood_request_id === item.id),
  });

  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [data, responses] = await Promise.all([
        apiRequest("/api/blood-requests", { signal }),
        user ? apiRequest("/api/me/blood-responses", { signal }) : Promise.resolve({ data: [] }),
      ]);
      setRequests(data.data.map((item) => normalize(item, responses.data)));
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [user?.id]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleRespond = async (id) => {
    if (!user) { navigate("/login", { state: { from: "/blood-donation" } }); return; }
    setActionError("");
    setRequests((items) => items.map((item) => item.id === id ? { ...item, isResponding: true } : item));
    try {
      await apiRequest(`/api/blood-requests/${id}/responses`, { method: "POST", body: {} });
      setRequests((items) => items.map((item) => item.id === id ? { ...item, hasResponded: true } : item));
    } catch (err) { setActionError(err.message); }
    finally { setRequests((items) => items.map((item) => item.id === id ? { ...item, isResponding: false } : item)); }
  };

  const handleClose = async (id) => {
    setActionError("");
    try {
      await apiRequest(`/api/blood-requests/${id}/status`, { method: "PATCH", body: { status: "completed" } });
      setRequests((items) => items.filter((item) => item.id !== id));
    } catch (err) { setActionError(err.message); }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!user || submittingForm) return;
    setSubmittingForm(true);
    setActionError("");
    try {
      const { data } = await apiRequest("/api/blood-requests", { method: "POST", body: {
        blood_group: bloodGroup, units: Number(units), hospital_or_location: hospital,
        required_date: neededBy, contact_phone: phone, notes: details, urgency: "high",
      } });
      setRequests((items) => [normalize(data), ...items]);
      setFormSuccess(true);
      setBloodGroup(""); setUnits(""); setHospital(""); setNeededBy(""); setPhone(""); setDetails("");
    } catch (err) { setActionError(err.message); }
    finally { setSubmittingForm(false); }
  };

  return (
    <div className="container mc-page-narrow py-4 py-lg-5 mc-motion-section">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3 border-bottom pb-3">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <Droplet size={26} className="text-danger" />
            Blood Donations
          </h2>
          <p className="text-muted mb-0 small">Request blood or help community members in emergencies.</p>
        </div>
        <button 
          className="btn btn-mc d-flex align-items-center gap-2"
          onClick={() => {
            if (!user) navigate("/login", { state: { from: "/blood-donation" } });
            else { setFormSuccess(false); setShowForm(!showForm); }
          }}
        >
          {showForm ? "Cancel Request" : <><Plus size={18} /> Request Blood</>}
        </button>
      </div>

      {actionError && <div className="alert alert-danger" role="alert">{actionError}</div>}
      {showForm && (
        <div className="card border-0 shadow-sm mb-5 border-top border-4 border-mc">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-4">Create Blood Request</h5>
            {formSuccess ? (
              <div className="alert alert-success text-center py-4 mb-0">
                <CheckCircle size={40} className="mb-2 text-success mx-auto" />
                <h6 className="fw-bold">Request Published Successfully!</h6>
                <p className="small mb-0 text-dark">Your request is now visible to the community.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateRequest}>
                <div className="row g-3">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold small">Blood Group <span className="text-danger">*</span></label>
                    <select className="form-select" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} required>
                      <option value="">Select Group</option>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold small">Required Bags (Units) <span className="text-danger">*</span></label>
                    <input type="number" min="1" max="10" className="form-control" value={units} onChange={(e) => setUnits(e.target.value)} required />
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label fw-semibold small">Hospital Name & Area <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" placeholder="e.g. Labaid Hospital, Dhanmondi" value={hospital} onChange={(e) => setHospital(e.target.value)} required />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold small">Needed By Date <span className="text-danger">*</span></label>
                    <input type="date" className="form-control" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} required />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold small">Contact Phone <span className="text-danger">*</span></label>
                    <input type="tel" className="form-control" placeholder="e.g. 01711223344" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  </div>
                  <div className="col-12 mb-4">
                    <label className="form-label fw-semibold small">Additional Details (Optional)</label>
                    <textarea className="form-control" rows="2" placeholder="Mention specific requirements like fresh blood or platelets..." value={details} onChange={(e) => setDetails(e.target.value)}></textarea>
                  </div>
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-light border" onClick={() => setShowForm(false)} disabled={submittingForm}>Cancel</button>
                  <button type="submit" className="btn btn-mc d-flex align-items-center gap-2" disabled={submittingForm}>
                    {submittingForm ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <Droplet size={16} />}
                    {submittingForm ? "Publishing..." : "Publish Request"}
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
              <div className="d-flex gap-3">
                <div className="placeholder bg-secondary rounded" style={{ width: "60px", height: "60px" }}></div>
                <div className="flex-fill">
                  <div className="placeholder col-4 bg-secondary rounded mb-2"></div>
                  <div className="placeholder col-6 bg-secondary rounded d-block mb-1"></div>
                  <div className="placeholder col-3 bg-secondary rounded d-block"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="alert alert-warning text-center py-5 shadow-sm">
          <AlertCircle size={32} className="text-warning mb-3 mx-auto" />
          <h5 className="fw-bold">Failed to load requests</h5>
          <p>{error}</p>
          <button className="btn btn-warning mt-2" onClick={() => fetchData()}>Try Again</button>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-5 text-muted border rounded shadow-sm bg-white">
          <Heart size={48} className="mb-3 opacity-25 mx-auto" />
          <h5 className="fw-bold">No Active Requests</h5>
          <p className="mb-0">Alhamdulillah, there are no active blood emergencies right now.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {requests.map(req => {
            const hasResponded = req.hasResponded;
            const isFulfilled = req.status !== "active";
            const isOwn = req.created_by === user?.id;
            const isDisabled = isFulfilled || hasResponded || isOwn;

            return (
              <div className={`card border-0 shadow-sm overflow-hidden ${req.urgent && req.status === "active" ? "border-start border-4 border-danger" : ""}`} key={req.id}>
                <div className="card-body p-4">
                  <div className="row align-items-center">
                    
                    <div className="col-auto text-center border-end pe-4 d-none d-sm-block">
                      <div className="d-flex align-items-center justify-content-center bg-danger-subtle text-danger fw-bold rounded-circle mx-auto mb-2" style={{ width: "60px", height: "60px", fontSize: "1.2rem" }}>
                        {req.group}
                      </div>
                      <span className="badge bg-light text-dark border">{req.units} Bag{req.units > 1 ? "s" : ""}</span>
                    </div>

                    <div className="col ps-sm-4">
                      <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <h5 className="fw-bold mb-0 text-dark d-sm-none">{req.group} &bull; {req.units} Bag{req.units > 1 ? "s" : ""}</h5>
                          <h5 className="fw-bold mb-0 text-dark d-none d-sm-block">Blood Required</h5>
                          {req.urgent && req.status === "active" && <span className="badge bg-danger">Urgent</span>}
                          {isFulfilled && <span className="badge bg-success">Fulfilled</span>}
                        </div>
                        <span className="text-muted small d-flex align-items-center gap-1">
                          <Clock size={13} /> {req.date}
                        </span>
                      </div>

                      <div className="d-flex flex-column gap-2 small text-secondary mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <MapPin size={15} /> <span>{req.hospital}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <Phone size={15} /> <span>{req.phone}</span>
                        </div>
                      </div>
                      
                      {req.details && <p className="small text-muted mb-3 border-start ps-3 border-2 border-light">{req.details}</p>}

                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <button 
                          className={`btn btn-sm d-flex align-items-center gap-2 fw-medium ${hasResponded ? "btn-success" : isFulfilled ? "btn-light border text-muted" : "btn-mc"}`}
                          disabled={isDisabled || req.isResponding}
                          onClick={() => handleRespond(req.id)}
                        >
                          {req.isResponding ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : hasResponded ? (
                            <CheckCircle size={16} />
                          ) : (
                            <Heart size={16} />
                          )}
                          {hasResponded ? "You Responded" : isOwn ? "Your request" : isFulfilled ? "Completed" : "I Can Donate"}
                        </button>
                        {isOwn && <button className="btn btn-sm btn-outline-mc" onClick={() => handleClose(req.id)}>Mark fulfilled</button>}
                      </div>
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
