import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Clock, FileWarning, ShieldCheck, Upload } from "lucide-react";
import { apiRequest } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import MosquePicker from "../components/MosquePicker";
import { fetchMosqueById } from "../utils/mosqueDiscovery";
import { PageSkeleton } from "../components/skeletons";
import { useLocale } from "../hooks/useLocale";
import { statusLabel } from "../utils/labels";

export default function MosqueAdminClaim() {
  const { t } = useLocale();
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
  const [mosque, setMosque] = useState(null);
  const mosqueId = mosque ? String(mosque.id) : "";
  const [document, setDocument] = useState(null);

  // ?mosque=ID (from "Claim this mosque instead" or an approved suggestion) preselects the mosque.
  const [searchParams] = useSearchParams();
  // [Urmee · F3 Part 3] ?mosque=ID (from "Claim this mosque instead" or an approved suggestion)
  // preselects the mosque on the claim form.
  const preselected = searchParams.get("mosque");
  useEffect(() => {
    if (preselected) fetchMosqueById(preselected).then(setMosque).catch(() => {});
  }, [preselected]);

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
    if (!mosqueId) {
      // [Urmee · F3 Part 3] The picker isn't a native <select>, so "required" is checked here.
      setSubmitError("Please search for your mosque and choose it from the list.");
      return;
    }
    
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
    return <PageSkeleton label={t("admin.claim.checking")} />;
  }

  if (fetchError) {
    return (
      <div className="container py-5 text-center">
        <FileWarning size={48} className="text-danger mb-3" />
        <h4 className="fw-bold">{t("admin.claim.loadFailed")}</h4>
        <p className="text-muted">{fetchError}</p>
        <button className="btn btn-outline-mc mt-3" onClick={() => window.location.reload()}>{t("common.tryAgain")}</button>
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
            {t("admin.claim.statusTitle", { status: statusLabel(t, status) })}
          </h3>
          
          <p className="text-muted mb-4 fs-5">
            {status === "approved"
              ? t("admin.claim.approved")
              : status === "rejected"
                ? t("admin.claim.rejected")
                : t("admin.claim.pending")}
          </p>

          {note && (
            <div className={`alert ${status === "rejected" ? "alert-danger" : "alert-info"} text-start d-inline-block mx-auto mb-4`}>
              <strong>{t("admin.claim.reviewerNote")}</strong> {note}
            </div>
          )}
          
          <div>
            <Link to={status === "approved" ? "/admin/dashboard" : "/"} className="btn btn-mc px-4 py-2">
              {status === "approved" ? t("admin.claim.goDashboard") : t("admin.claim.returnHome")}
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
        <h2 className="fw-bold">{t("admin.claim.title")}</h2>
        <p className="text-muted">{t("admin.claim.subtitle")}</p>
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
                <h5 className="fw-bold border-bottom pb-2">{t("admin.claim.applicantInfo")}</h5>
              </div>
              
              <div className="col-md-6">
                <label className="form-label fw-semibold">{t("admin.claim.fullName")} <span className="text-danger">*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={applicantName} 
                  onChange={(e) => setApplicantName(e.target.value)} 
                  required 
                />
              </div>
              
              <div className="col-md-6">
                <label className="form-label fw-semibold">{t("admin.claim.phone")} <span className="text-danger">*</span></label>
                <input 
                  type="tel" 
                  className="form-control" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold">{t("admin.claim.role")} <span className="text-danger">*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder={t("admin.claim.rolePlaceholder")}
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                  required 
                />
              </div>

              <div className="col-12 mt-4">
                <h5 className="fw-bold border-bottom pb-2">{t("admin.claim.mosqueInfo")}</h5>
              </div>
              
              <div className="col-12">
                <MosquePicker label={t("admin.claim.selectMosque")} required value={mosque} onChange={setMosque} />
                <div className="form-text">
                  {t("admin.claim.cantFind")} <Link to="/mosques/suggest">{t("admin.claim.suggestIt")}</Link>
                </div>
              </div>

              <div className="col-12 mt-4">
                <h5 className="fw-bold border-bottom pb-2">{t("admin.claim.proof")}</h5>
                <p className="small text-muted mb-3">{t("admin.claim.proofHelp")}</p>
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
                    <div className="fw-semibold text-mc">{t("admin.claim.upload")}</div>
                    <div className="small text-muted mt-1">{document ? document.name : t("admin.claim.formats")}</div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-5 text-end">
              <Link to="/" className="btn btn-light border px-4 py-2 me-2" disabled={submitting}>{t("common.cancel")}</Link>
              <button type="submit" className="btn btn-mc px-4 py-2 d-inline-flex align-items-center gap-2" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    {t("admin.claim.submitting")}
                  </>
                ) : (
                  t("admin.claim.submit")
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
