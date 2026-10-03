import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Droplet,
  Heart,
  MapPin,
  Phone,
  Plus,
  Share2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";
import { ListRowsSkeleton, SkeletonRegion } from "../components/skeletons";
import ConfirmDialog from "../components/ConfirmDialog";
import RespondDialog from "../components/blood/RespondDialog";
import { BLOOD_GROUPS, PAGE_SIZE, filterBloodRequests, shareOnWhatsAppUrl, telHref } from "../utils/bloodRequest";

export default function BloodDonation() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);

  // [Urmee · F6 Part 1] Filters live in the URL (?group=O%2B&urgent=1&area=dhaka&by=2026-10-20), so a filtered list can be shared.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => ({
    group: searchParams.get("group") || "",
    urgent: searchParams.get("urgent") === "1",
    area: searchParams.get("area") || "",
    by: searchParams.get("by") || "",
  }), [searchParams]);
  const setFilter = (key, value) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set(key, value === true ? "1" : value); else next.delete(key);
    return next;
  }, { replace: true });
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [respondTo, setRespondTo] = useState(null);
  const [closing, setClosing] = useState(null);
  const shown = useMemo(() => filterBloodRequests(requests, filters), [requests, filters]);
  // Any filter change starts again from the first page.
  useEffect(() => setVisible(PAGE_SIZE), [filters]);
  
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
  const [urgency, setUrgency] = useState("normal");
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

  // [Urmee · F6 Part 1] Responding opens a dialog with an optional message instead of sending an empty body.
  const handleRespond = (request) => {
    if (!user) { navigate("/login", { state: { from: "/blood-donation" } }); return; }
    setRespondTo(request);
  };

  // Marking a request fulfilled now asks for confirmation first.
  // [Urmee · F6 Part 1] The confirmation dialog calls this, so a mis-click can't close a request.
  const handleClose = async (id) => {
    await apiRequest(`/api/blood-requests/${id}/status`, { method: "PATCH", body: { status: "completed" } });
    setRequests((items) => items.filter((item) => item.id !== id));
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!user || submittingForm) return;
    setSubmittingForm(true);
    setActionError("");
    try {
      const { data } = await apiRequest("/api/blood-requests", { method: "POST", body: {
        blood_group: bloodGroup, units: Number(units), hospital_or_location: hospital,
        required_date: neededBy, contact_phone: phone, notes: details, urgency,
      } });
      setRequests((items) => [normalize(data), ...items]);
      setFormSuccess(true);
      setBloodGroup(""); setUnits(""); setHospital(""); setNeededBy(""); setPhone(""); setUrgency("normal"); setDetails("");
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

      <section className="mc-blood-filters mb-4" aria-label="Filter blood requests">
        <div className="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Blood group">
          {BLOOD_GROUPS.map((group) => (
            <button key={group} type="button" className={`btn btn-sm ${filters.group === group ? "btn-danger" : "btn-outline-danger"}`} aria-pressed={filters.group === group} onClick={() => setFilter("group", filters.group === group ? "" : group)}>{group}</button>
          ))}
        </div>
        <div className="row g-2 align-items-end">
          <div className="col-sm-5">
            <label className="form-label small mb-1" htmlFor="blood-area">Hospital or area</label>
            <input id="blood-area" type="search" className="form-control form-control-sm" placeholder="e.g. Dhanmondi" value={filters.area} onChange={(event) => setFilter("area", event.target.value)} />
          </div>
          <div className="col-sm-4">
            <label className="form-label small mb-1" htmlFor="blood-by">Needed by</label>
            <input id="blood-by" type="date" className="form-control form-control-sm" value={filters.by} onChange={(event) => setFilter("by", event.target.value)} />
          </div>
          <div className="col-sm-3 d-flex align-items-center justify-content-between gap-2">
            <div className="form-check form-switch mb-0">
              <input id="blood-urgent" className="form-check-input" type="checkbox" checked={filters.urgent} onChange={(event) => setFilter("urgent", event.target.checked)} />
              <label className="form-check-label small" htmlFor="blood-urgent">Urgent only</label>
            </div>
            {(filters.group || filters.urgent || filters.area || filters.by) && <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setSearchParams({}, { replace: true })}>Clear</button>}
          </div>
        </div>
      </section>

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
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold small">Needed By Date <span className="text-danger">*</span></label>
                    <input type="date" className="form-control" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} required />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold small">Contact Phone <span className="text-danger">*</span></label>
                    <input type="tel" className="form-control" placeholder="e.g. 01711223344" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold small">Urgency Level <span className="text-danger">*</span></label>
                    <select className="form-select" value={urgency} onChange={(e) => setUrgency(e.target.value)} required>
                      <option value="normal">Normal</option>
                      <option value="high">High (Urgent)</option>
                      <option value="critical">Critical</option>
                    </select>
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
        <SkeletonRegion label="Loading blood requests…"><ListRowsSkeleton rows={3} /></SkeletonRegion>
      ) : error ? (
        <div className="alert alert-warning text-center py-5 shadow-sm">
          <AlertCircle size={32} className="text-warning mb-3 mx-auto" />
          <h5 className="fw-bold">Failed to load requests</h5>
          <p>{error}</p>
          <button className="btn btn-warning mt-2" onClick={() => fetchData()}>Try Again</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-5 text-muted border rounded shadow-sm bg-white">
          <Heart size={48} className="mb-3 opacity-25 mx-auto" />
          <h5 className="fw-bold">{requests.length === 0 ? "No Active Requests" : "No requests match these filters"}</h5>
          <p className="mb-0">{requests.length === 0 ? "Alhamdulillah, there are no active blood emergencies right now." : "Try a different blood group or clear the filters."}</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {shown.slice(0, visible).map(req => {
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
                          <h5 className="fw-bold mb-0 d-sm-none"><Link to={`/blood-donation/${req.id}`} className="text-dark text-decoration-none">{req.group} &bull; {req.units} Bag{req.units > 1 ? "s" : ""}</Link></h5>
                          <h5 className="fw-bold mb-0 d-none d-sm-block"><Link to={`/blood-donation/${req.id}`} className="text-dark text-decoration-none">Blood Required</Link></h5>
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
                          <Phone size={15} /> <a href={telHref(req.phone)}>{req.phone}</a>
                        </div>
                      </div>
                      
                      {req.details && <p className="small text-muted mb-3 border-start ps-3 border-2 border-light">{req.details}</p>}

                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <button 
                          className={`btn btn-sm d-flex align-items-center gap-2 fw-medium ${hasResponded ? "btn-success" : isFulfilled ? "btn-light border text-muted" : "btn-mc"}`}
                          disabled={isDisabled || req.isResponding}
                          onClick={() => handleRespond(req)}
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
                        {isOwn && <button className="btn btn-sm btn-outline-mc" onClick={() => setClosing(req)}>Mark fulfilled</button>}
                        <Link to={`/blood-donation/${req.id}`} className="btn btn-sm btn-outline-secondary">{isOwn ? "See offers" : "Details"}</Link>
                        <a href={shareOnWhatsAppUrl(req, `${window.location.origin}/blood-donation/${req.id}`)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"><Share2 size={14} aria-hidden="true" /> Share</a>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
          {shown.length > visible && (
            <div className="text-center">
              <button type="button" className="btn btn-outline-mc" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Load more requests</button>
            </div>
          )}
        </div>
      )}
      {respondTo && <RespondDialog request={respondTo} onDone={() => setRequests((items) => items.map((item) => item.id === respondTo.id ? { ...item, hasResponded: true } : item))} onClose={() => setRespondTo(null)} />}
      {closing && <ConfirmDialog title="Mark this request as fulfilled?" message={`${closing.group} at ${closing.hospital}`} confirmLabel="Mark fulfilled" tone="success" onConfirm={() => handleClose(closing.id)} onClose={() => setClosing(null)} />}
    </div>
  );
}
