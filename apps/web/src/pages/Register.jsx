import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  CircleAlert,
  FileText,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Upload,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { sendOtp, verifyOtp, updateUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("user"); // "user" or "mosque_admin"
  const [step, setStep] = useState("details"); // "details" | "otp"
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    mosqueName: "",
    mosqueAddress: "",
    mosqueRole: "",
    terms: false,
  });
  const [proofDocument, setProofDocument] = useState(null);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [success, setSuccess] = useState(""); // "" or "user" or "mosque_admin"

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofDocument(file.name);
    }
  };

  const validateDetails = () => {
    if (!form.fullName.trim()) {
      setError("Please enter your name.");
      return false;
    }

    if (!form.email.trim()) {
      setError("Please enter a valid email.");
      return false;
    }

    const trimmedPhone = form.phone.trim();
    if (!trimmedPhone) {
      setError("Please enter your phone number.");
      return false;
    }

    if (!/^\+[1-9]\d{7,14}$/.test(trimmedPhone)) {
      setError("Phone must include country code, e.g. +8801712345678.");
      return false;
    }

    if (!form.terms) {
      setError("You must agree to the Terms and Conditions.");
      return false;
    }

    if (role === "mosque_admin") {
      if (!form.mosqueRole.trim()) {
        setError("Role in mosque is required.");
        return false;
      }
      if (!form.mosqueName.trim()) {
        setError("Mosque name is required.");
        return false;
      }
      if (!form.mosqueAddress.trim()) {
        setError("Mosque address is required.");
        return false;
      }
      if (!proofDocument) {
        setError("Please upload a proof document.");
        return false;
      }
    }

    return true;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const htmlForm = e.currentTarget;
    if (!htmlForm.checkValidity()) {
      setValidated(true);
      return;
    }

    if (!validateDetails()) {
      setValidated(true);
      return;
    }

    setLoading(true);
    const res = await sendOtp(form.phone.trim());
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Failed to send OTP. Please check your phone number.");
      return;
    }

    setMessage(res.message || `OTP sent to ${form.phone.trim()}.`);
    setStep("otp");
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setError("Please enter the verification code.");
      return;
    }

    setLoading(true);
    const res = await verifyOtp(form.phone.trim(), trimmedOtp);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Invalid or expired OTP. Please try again.");
      return;
    }

    updateUser({
      name: form.fullName.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      ...(role === "mosque_admin"
        ? {
            role: "mosque_admin",
            status: "pending",
            mosqueName: form.mosqueName.trim(),
            mosqueAddress: form.mosqueAddress.trim(),
            mosqueRole: form.mosqueRole.trim(),
            proofDocument,
          }
        : { role: "normal_user" }),
    });

    setSuccess(role === "mosque_admin" ? "mosque_admin" : "user");

    if (role === "user") {
      setTimeout(() => navigate("/"), 2500);
    }
  };

  const handleResendOtp = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    const res = await sendOtp(form.phone.trim());
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Failed to resend OTP.");
    } else {
      setMessage("A new OTP has been sent to your phone.");
    }
  };

  const handleChangeDetails = () => {
    setStep("details");
    setOtp("");
    setError("");
    setMessage("");
  };

  // Render registration success views
  if (success === "user") {
    return (
      <div className="mc-auth-wrap py-5 d-flex align-items-center justify-content-center" style={{ minHeight: "70vh" }}>
        <div className="card mc-auth-card p-5 text-center shadow-lg border-0" style={{ maxWidth: "480px" }}>
          <div className="text-success mb-4">
            <CheckCircle2 size={70} className="mx-auto animate-bounce" />
          </div>
          <h3 className="fw-bold mb-3">Registration Successful!</h3>
          <p className="text-muted mb-4">
            Welcome to <strong>MosqueConnect</strong>, {form.fullName}! Your account has been created.
          </p>
          <div className="spinner-border text-mc mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="small text-muted">Redirecting you to the home page...</p>
        </div>
      </div>
    );
  }

  if (success === "mosque_admin") {
    return (
      <div className="mc-auth-wrap py-5 d-flex align-items-center justify-content-center" style={{ minHeight: "75vh" }}>
        <div className="card mc-auth-card p-5 text-center shadow-lg border-0" style={{ maxWidth: "520px" }}>
          <div className="text-warning mb-4">
            <CheckCircle2 size={70} className="mx-auto text-success" />
          </div>
          <h3 className="fw-bold mb-3">Application Submitted!</h3>
          <p className="text-muted mb-4">
            Your phone is verified. Your mosque admin request has been recorded and is pending Super Admin approval.
          </p>
          <div className="alert alert-warning py-3 text-start small mb-4">
            <h6 className="fw-bold mb-2">Registration Details:</h6>
            <ul className="mb-0 ps-3">
              <li><strong>Applicant:</strong> {form.fullName}</li>
              <li><strong>Mosque:</strong> {form.mosqueName}</li>
              <li><strong>Role in Mosque:</strong> {form.mosqueRole}</li>
              <li><strong>Status:</strong> <span className="badge bg-warning text-dark">Pending Verification</span></li>
            </ul>
          </div>
          <p className="text-muted small mb-4">
            You can explore community features while our team verifies your credentials.
          </p>
          <button className="btn btn-mc btn-lg w-100" onClick={() => navigate("/profile")}>
            Go to My Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mc-auth-wrap py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-9 col-lg-7">
            <div className="card mc-auth-card p-4 p-sm-5 shadow-sm mc-motion-section">
              <div className="text-center mb-4">
                <div className="mc-feature-icon mx-auto mb-3">
                  <UserPlus size={25} aria-hidden="true" />
                </div>
                <h3 className="fw-bold mb-1">Create your account</h3>
                <p className="text-muted mb-0">
                  {step === "details"
                    ? "Join the community and manage your mosques."
                    : `Enter the OTP sent to ${form.phone}.`}
                </p>
              </div>

              {step === "details" && (
                <>
                  <div className="row g-2 mb-4">
                    <div className="col-6">
                      <button
                        type="button"
                        className={`btn w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-semibold border ${
                          role === "user" ? "btn-mc border-mc text-white" : "btn-light text-secondary"
                        }`}
                        onClick={() => {
                          setRole("user");
                          setError("");
                        }}
                      >
                        <UserRound size={18} />
                        Regular User
                      </button>
                    </div>
                    <div className="col-6">
                      <button
                        type="button"
                        className={`btn w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-semibold border ${
                          role === "mosque_admin" ? "btn-mc border-mc text-white" : "btn-light text-secondary"
                        }`}
                        onClick={() => {
                          setRole("mosque_admin");
                          setError("");
                        }}
                      >
                        <Building2 size={18} />
                        Mosque Admin
                      </button>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="alert alert-danger py-2 small mb-4 text-start d-flex align-items-center">
                  <CircleAlert size={16} className="me-2 flex-shrink-0" aria-hidden="true" />
                  <div>{error}</div>
                </div>
              )}

              {message && !error && (
                <div className="alert alert-success py-2 small mb-4 text-start d-flex align-items-center">
                  <CheckCircle2 size={16} className="me-2 flex-shrink-0" aria-hidden="true" />
                  <div>{message}</div>
                </div>
              )}

              {step === "details" ? (
                <form className={validated ? "was-validated" : ""} noValidate onSubmit={handleSendOtp}>
                  <div className="row">
                    <div className="col-sm-6 mb-3">
                      <label className="form-label">{role === "user" ? "Full name" : "Applicant's full name"}</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <UserRound size={16} aria-hidden="true" />
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Ahmed Ali"
                          value={form.fullName}
                          onChange={set("fullName")}
                          disabled={loading}
                          required
                        />
                        <div className="invalid-feedback">Please enter your name.</div>
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <label className="form-label">Email address</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <Mail size={16} aria-hidden="true" />
                        </span>
                        <input
                          type="email"
                          className="form-control"
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={set("email")}
                          disabled={loading}
                          required
                        />
                        <div className="invalid-feedback">Please enter a valid email.</div>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-sm-12 mb-3">
                      <label className="form-label">Phone number</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <Phone size={16} aria-hidden="true" />
                        </span>
                        <input
                          type="tel"
                          className="form-control"
                          placeholder="e.g. +8801712345678"
                          value={form.phone}
                          onChange={set("phone")}
                          disabled={loading}
                          required
                        />
                        <div className="invalid-feedback">Please enter your phone number with country code.</div>
                      </div>
                      <div className="form-text text-muted small">
                        Include country code with plus prefix (e.g. +8801XXXXXXXXX). We will verify this number by OTP.
                      </div>
                    </div>
                  </div>

                  {role === "mosque_admin" && (
                    <div className="card bg-light border-0 p-4 mb-4 mt-2">
                      <h5 className="fw-semibold text-mc mb-3 d-flex align-items-center gap-2">
                        <Building2 size={20} />
                        Mosque Information
                      </h5>

                      <div className="row">
                        <div className="col-sm-6 mb-3">
                          <label className="form-label">Role in the Mosque</label>
                          <div className="input-group">
                            <span className="input-group-text">
                              <Briefcase size={16} aria-hidden="true" />
                            </span>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. Imam / Mutawalli"
                              value={form.mosqueRole}
                              onChange={set("mosqueRole")}
                              disabled={loading}
                              required={role === "mosque_admin"}
                            />
                            <div className="invalid-feedback">Please enter your mosque role.</div>
                          </div>
                        </div>

                        <div className="col-sm-6 mb-3">
                          <label className="form-label">Mosque Name</label>
                          <div className="input-group">
                            <span className="input-group-text">
                              <Building2 size={16} aria-hidden="true" />
                            </span>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="e.g. Gulshan Central Mosque"
                              value={form.mosqueName}
                              onChange={set("mosqueName")}
                              disabled={loading}
                              required={role === "mosque_admin"}
                            />
                            <div className="invalid-feedback">Please enter the mosque name.</div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Mosque Address</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <MapPin size={16} aria-hidden="true" />
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Full address of the mosque"
                            value={form.mosqueAddress}
                            onChange={set("mosqueAddress")}
                            disabled={loading}
                            required={role === "mosque_admin"}
                          />
                          <div className="invalid-feedback">Please enter the mosque address.</div>
                        </div>
                      </div>

                      <div className="mb-0">
                        <label className="form-label">Proof Document (Authorization Letter, Utility Bill, etc.)</label>
                        <div
                          className="border border-dashed rounded-3 p-3 text-center bg-white"
                          style={{ borderStyle: "dashed", cursor: "pointer", borderColor: "#dee2e6" }}
                        >
                          <input
                            type="file"
                            id="proofUpload"
                            className="visually-hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.png,.jpg,.jpeg"
                            required={role === "mosque_admin"}
                          />
                          <label htmlFor="proofUpload" className="w-100 m-0" style={{ cursor: "pointer" }}>
                            {proofDocument ? (
                              <div className="d-flex align-items-center justify-content-center gap-2 text-success">
                                <FileText size={22} />
                                <span className="fw-semibold small">{proofDocument}</span>
                                <span className="badge bg-success-subtle text-success border border-success-subtle small ms-1">Attached</span>
                              </div>
                            ) : (
                              <div className="text-secondary">
                                <Upload size={24} className="mx-auto mb-2 text-muted" />
                                <p className="mb-1 small fw-semibold">Click to upload document</p>
                                <p className="mb-0 text-muted" style={{ fontSize: "11px" }}>PDF, PNG, JPG (Max 5MB)</p>
                              </div>
                            )}
                          </label>
                          {validated && !proofDocument && (
                            <div className="text-danger small mt-2 d-block" style={{ fontSize: "12px" }}>
                              Please upload a proof document.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="form-check mb-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="terms"
                      checked={form.terms}
                      onChange={set("terms")}
                      disabled={loading}
                      required
                    />
                    <label className="form-check-label small" htmlFor="terms">
                      I agree to the{" "}
                      <a href="#" className="text-mc text-decoration-none" onClick={(e) => e.preventDefault()}>
                        Terms &amp; Privacy Policy
                      </a>
                      .
                    </label>
                    <div className="invalid-feedback">You must accept the terms.</div>
                  </div>

                  <button type="submit" className="btn btn-mc w-100 btn-lg mb-3" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        Sending OTP...
                      </>
                    ) : role === "user" ? (
                      "Continue with OTP"
                    ) : (
                      "Continue Admin Request"
                    )}
                  </button>
                  <p className="text-center mb-0 small">
                    Already have an account?{" "}
                    <Link to="/login" className="text-mc fw-semibold text-decoration-none">
                      Log in
                    </Link>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} noValidate>
                  <div className="mb-3">
                    <label className="form-label">Verification Code (OTP)</label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <KeyRound size={16} aria-hidden="true" />
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        className="form-control"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value);
                          setError("");
                        }}
                        disabled={loading}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-mc w-100 btn-lg mb-3" disabled={loading || !otp.trim()}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Create Account"
                    )}
                  </button>

                  <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top small">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none text-muted d-flex align-items-center gap-1"
                      onClick={handleChangeDetails}
                      disabled={loading}
                    >
                      <ArrowLeft size={14} />
                      Edit details
                    </button>

                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none text-mc fw-semibold d-flex align-items-center gap-1"
                      onClick={handleResendOtp}
                      disabled={loading}
                    >
                      <RotateCcw size={14} />
                      Resend OTP
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
