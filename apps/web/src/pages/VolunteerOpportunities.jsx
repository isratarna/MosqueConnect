import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export default function VolunteerOpportunities() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "mosque_admin" && user?.status === "approved";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  
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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setOpportunities([
        { 
          id: "vol-1", 
          title: "Jummah Crowd Control", 
          mosqueName: "Baitul Mukarram National Mosque",
          description: "Assist with guiding attendees and managing parking during Friday prayers.", 
          date: "2026-08-28", 
          time: "12:00 PM - 2:30 PM",
          location: "Main Gate & Parking Area", 
          capacity: 10, 
          status: "active",
          instructions: "Please wear a high-visibility vest provided at the management office.",
          participants: ["user-222", "user-333"] 
        },
        { 
          id: "vol-2", 
          title: "Disaster Relief Packing", 
          mosqueName: "Gulshan Society Mosque",
          description: "Help pack dry food and relief materials for flood victims.", 
          date: "2026-08-29", 
          time: "9:00 AM - 5:00 PM",
          location: "Community Center Hall B", 
          capacity: 25, 
          status: "active",
          instructions: "",
          participants: ["user_mock_id", "user-444", "user-555", "user-666"] 
        },
        { 
          id: "vol-3", 
          title: "Youth Quran Class Setup", 
          mosqueName: "Sobhanbag Jame Masjid",
          description: "Arrange chairs, whiteboards, and materials for the weekend youth classes.", 
          date: "2026-08-30", 
          time: "4:00 PM - 5:00 PM",
          location: "Level 2 Classrooms", 
          capacity: 3, 
          status: "filled",
          instructions: "",
          participants: ["user-1", "user-2", "user-3"] 
        },
      ]);
    } catch (err) {
      setError("Failed to load volunteer opportunities. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = async (id) => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    setOpportunities(prev => prev.map(opp => {
      if (opp.id === id) {
        return { ...opp, isApplying: true };
      }
      return opp;
    }));

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    setOpportunities(prev => prev.map(opp => {
      if (opp.id === id) {
        const newParticipants = [...opp.participants, user.id || "current-user"];
        const newStatus = newParticipants.length >= opp.capacity ? "filled" : opp.status;
        return { ...opp, isApplying: false, participants: newParticipants, status: newStatus };
      }
      return opp;
    }));
  };

  const handleCloseOpportunity = async (id) => {
    // Admin action
    setOpportunities(prev => prev.map(opp => {
      if (opp.id === id) {
        return { ...opp, isUpdating: true };
      }
      return opp;
    }));

    await new Promise(resolve => setTimeout(resolve, 400));

    setOpportunities(prev => prev.map(opp => {
      if (opp.id === id) {
        return { ...opp, isUpdating: false, status: "completed" };
      }
      return opp;
    }));
  };

  const handleCreateOpportunity = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    setSubmittingForm(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newOpp = {
      id: `vol-${Date.now()}`,
      title,
      mosqueName: user.mosqueName || "Your Admin Mosque",
      description,
      date,
      time,
      location,
      capacity: parseInt(capacity, 10),
      instructions,
      status: "active",
      participants: []
    };

    setOpportunities(prev => [newOpp, ...prev]);
    setSubmittingForm(false);
    setFormSuccess(true);
    
    setTimeout(() => {
      setFormSuccess(false);
      setShowForm(false);
      setTitle("");
      setDescription("");
      setDate("");
      setTime("");
      setLocation("");
      setCapacity("");
      setInstructions("");
    }, 2500);
  };

  return (
    <div className="container py-4 py-lg-5 mc-motion-section" style={{ maxWidth: "900px", minHeight: "80vh" }}>
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
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel Creation" : <><Plus size={18} /> Create Opportunity</>}
          </button>
        )}
      </div>

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
                    <label className="form-label fw-semibold small">Time Window <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" placeholder="e.g. 10:00 AM - 1:00 PM" value={time} onChange={(e) => setTime(e.target.value)} required />
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
          <button className="btn btn-warning mt-2" onClick={fetchData}>Try Again</button>
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
            const hasApplied = opp.participants.includes(user?.id || "current-user");
            const isFilled = opp.status === "filled";
            const isCompleted = opp.status === "completed";
            const isDisabled = isFilled || isCompleted || hasApplied;

            return (
              <div className={`card border-0 shadow-sm overflow-hidden ${opp.status === "active" ? "border-start border-4 border-mc" : "opacity-75"}`} key={opp.id}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                    <h5 className="fw-bold mb-0 text-dark">{opp.title}</h5>
                    <div>
                      {opp.status === "active" && <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>}
                      {opp.status === "filled" && <span className="badge bg-warning-subtle text-warning border border-warning-subtle text-dark">Filled</span>}
                      {opp.status === "completed" && <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Completed</span>}
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
                        <Users size={16} /> <span>{opp.participants.length} / {opp.capacity} Volunteers</span>
                      </div>
                    </div>
                  </div>

                  <hr className="my-3 opacity-10" />

                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <div>
                      {isAdmin ? (
                        <div className="small text-muted fw-semibold">
                          Admin View: {opp.participants.length} Applications
                        </div>
                      ) : (
                        <div className="small text-muted">
                          {hasApplied ? "Jazakallah Khair for participating!" : "Sign up to help your community."}
                        </div>
                      )}
                    </div>
                    
                    <div className="d-flex gap-2">
                      {isAdmin && opp.status === "active" && (
                        <button 
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleCloseOpportunity(opp.id)}
                          disabled={opp.isUpdating}
                        >
                          {opp.isUpdating ? "Closing..." : "Mark as Completed"}
                        </button>
                      )}
                      
                      {!isAdmin && (
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
                          {hasApplied ? "You Applied" : isFilled ? "Spots Filled" : isCompleted ? "Completed" : "Volunteer Now"}
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
