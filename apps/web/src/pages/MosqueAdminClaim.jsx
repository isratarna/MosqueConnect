import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Clock, FileWarning, ShieldCheck, Upload } from "lucide-react";
import { apiRequest } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";
import { useMosqueDiscovery } from "../hooks/useMosqueDiscovery";

export default function MosqueAdminClaim() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [activeClaim, setActiveClaim] = useState(null);
  const [fetchError, setFetchError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  
  // Form State
  const [applicantName, setApplicantName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState("");
  const [mosqueId, setMosqueId] = useState("");
  const [document, setDocument] = useState(null);

  // Mosques List State
  const origin = useGeolocation();
  const discovery = useMosqueDiscovery(origin);
  const mosques = discovery.mosques || [];
  const loadingMosques = discovery.status === "loading" || discovery.status === "idle";

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFetchError("");
    
    apiRequest("/api/verification-requests/me", { signal: controller.signal })
      .then((data) => {
        // Assume API returns an object or null
        // Some APIs wrap in { data: ... }
        const claim = data?.data || data; 
        if (claim && Object.keys(claim).length > 0) {
          setActiveClaim(claim);
        } else {
          setActiveClaim(null);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError" && err.status !== 404) {
          setFetchError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
      
    return () => controller.abort();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    
    setSubmitting(true);
    setSubmitError("");
    
    try {
      const formData = new FormData();
      formData.append("applicant_name", applicantName);
      formData.append("phone", phone);
      formData.append("role_in_mosque", role);
      formData.append("mosque_id", mosqueId);
      
      if (document) {
        formData.append("proof_document", document);
      }
      
      const { data } = await apiRequest("/api/verification-requests", {
        method: "POST",
        body: formData,
      });
      
      setActiveClaim(data || true); // Trigger the success/status view
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-mc mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted">Checking application status...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="container py-5 text-center">
        <FileWarning size={48} className="text-danger mb-3" />
        <h4 className="fw-bold">Unable to load status</h4>
        <p className="text-muted">{fetchError}</p>
        <button className="btn btn-outline-mc mt-3" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  if (activeClaim) {
    // If the user already has a claim, render status UI
    const status = activeClaim.status || "pending";
    const note = activeClaim.review_note;
    
    return (
      <div className="container py-5 mc-page-narrow mc-motion-section">
        <div className="card border-0 shadow-sm text-center p-4 p-md-5">
          {status === "approved" ? (
            <CheckCircle size={64} className="text-success mx-auto mb-4" />
          ) : status === "rejected" ? (
            <FileWarning size={64} className="text-danger mx-auto mb-4" />
          ) : (
            <Clock size={64} className="text-warning mx-auto mb-4" />
          )}
          
          <h3 className="fw-bold mb-2">
            Application Status: <span className="text-capitalize">{status.replace("_", " ")}</span>
          </h3>
          
          <p className="text-muted mb-4 fs-5">
            {status === "approved" 
              ? "Jazakallah Khair! Your mosque administration request has been approved." 
              : status === "rejected"
                ? "Unfortunately, your application was not approved at this time."
                : "Your verification request is currently under review by our team. We will update you soon."}
          </p>

          {note && (
            <div className={`alert ${status === "rejected" ? "alert-danger" : "alert-info"} text-start d-inline-block mx-auto mb-4`}>
              <strong>Note from reviewer:</strong> {note}
            </div>
          )}
          
          <div>
            <Link to={status === "approved" ? "/admin/dashboard" : "/"} className="btn btn-mc px-4 py-2">
              {status === "approved" ? "Go to Dashboard" : "Return to Home"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 py-lg-5 mc-page-narrow mc-motion-section">
      <div className="text-center mb-5">
        <span className="rounded-circle bg-success-subtle text-success p-3 d-inline-block mb-3">
          <ShieldCheck size={32} />
        </span>
        <h2 className="fw-bold">Mosque Administrator Claim</h2>
        <p className="text-muted">Apply to manage your mosque's profile, events, and announcements on MosqueConnect.</p>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4 p-lg-5">
          {submitError && (
            <div className="alert alert-danger mb-4" role="alert">
              {submitError}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="row g-4">
              <div className="col-12">
                <h5 className="fw-bold border-bottom pb-2">Applicant Information</h5>
              </div>
              
              <div className="col-md-6">
                <label className="form-label fw-semibold">Full Name <span className="text-danger">*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={applicantName} 
                  onChange={(e) => setApplicantName(e.target.value)} 
                  required 
                />
              </div>
              
              <div className="col-md-6">
                <label className="form-label fw-semibold">Phone Number <span className="text-danger">*</span></label>
                <input 
                  type="tel" 
                  className="form-control" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold">Your Role in the Mosque <span className="text-danger">*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Committee Member, Imam, Secretary"
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                  required 
                />
              </div>

              <div className="col-12 mt-4">
                <h5 className="fw-bold border-bottom pb-2">Mosque Information</h5>
              </div>
              
              <div className="col-12">
                <label className="form-label fw-semibold">Select Mosque <span className="text-danger">*</span></label>
                <select 
                  className="form-select" 
                  value={mosqueId} 
                  onChange={(e) => setMosqueId(e.target.value)} 
                  required
                  disabled={loadingMosques}
                >
                  <option value="">{loadingMosques ? "Locating nearby mosques..." : "-- Select a Mosque --"}</option>
                  {mosques.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.address ? `- ${m.address}` : ""}
                    </option>
                  ))}
                </select>
                {discovery.status === "error" && (
                  <div className="small text-danger mt-1">
                    Failed to load nearby mosques: {discovery.error}. Please ensure location services are enabled.
                  </div>
                )}
              </div>

              <div className="col-12 mt-4">
                <h5 className="fw-bold border-bottom pb-2">Verification Proof</h5>
                <p className="small text-muted mb-3">
                  Please upload a document that proves your association with the mosque (e.g. official letterhead, committee resolution, ID card). Maximum size: 5MB.
                </p>
              </div>
              
              <div className="col-12">
                <div className="border border-2 border-dashed rounded p-4 text-center bg-light">
                  <input 
                    type="file" 
                    id="proof-upload" 
                    className="d-none" 
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setDocument(e.target.files[0])}
                    required
                  />
                  <label htmlFor="proof-upload" className="cursor-pointer m-0 d-block" style={{ cursor: 'pointer' }}>
                    <Upload size={32} className="text-secondary mb-2" />
                    <div className="fw-semibold text-mc">Click to upload document</div>
                    <div className="small text-muted mt-1">{document ? document.name : "Supported formats: PDF, JPG, PNG"}</div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-5 text-end">
              <Link to="/" className="btn btn-light border px-4 py-2 me-2" disabled={submitting}>Cancel</Link>
              <button type="submit" className="btn btn-mc px-4 py-2 d-inline-flex align-items-center gap-2" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
