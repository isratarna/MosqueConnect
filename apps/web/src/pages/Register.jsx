import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Upload,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("user"); // "user" or "mosque_admin"
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    mosqueName: "",
    mosqueAddress: "",
    mosqueRole: "",
    terms: false,
  });
  const [proofDocument, setProofDocument] = useState(null);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(""); // "" or "user" or "mosque_admin"

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const passwordsMatch = form.password === form.confirm;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofDocument(file.name);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");

    const htmlForm = e.currentTarget;
    if (!htmlForm.checkValidity()) {
      setValidated(true);
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      setValidated(true);
      return;
    }

    if (!form.terms) {
      setError("You must agree to the Terms and Conditions.");
      setValidated(true);
      return;
    }

    if (role === "mosque_admin") {
      if (!form.mosqueRole.trim()) {
        setError("Role in mosque is required.");
        setValidated(true);
        return;
      }
      if (!form.mosqueName.trim()) {
        setError("Mosque name is required.");
        setValidated(true);
        return;
      }
      if (!form.mosqueAddress.trim()) {
        setError("Mosque address is required.");
        setValidated(true);
        return;
      }
      if (!proofDocument) {
        setError("Please upload a proof document.");
        setValidated(true);
        return;
      }
    }

    const res = register({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      password: form.password,
      role: role,
      mosqueName: form.mosqueName,
      mosqueAddress: form.mosqueAddress,
      mosqueRole: form.mosqueRole,
      proofDocument: proofDocument,
    });

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setSuccess(role);

    if (role === "user") {
      setTimeout(() => {
        navigate("/");
      }, 2500);
    }
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
            Your mosque admin registration has been submitted and is pending Super Admin approval.
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
            You have been logged in with standard user access. You can explore the community features while our team verifies your credentials.
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
                <p className="text-muted mb-0">Join the community and manage your mosques.</p>
              </div>

              {/* Account Type Selector */}
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

              {error && (
                <div className="alert alert-danger py-2 small mb-4 text-start">
                  {error}
                </div>
              )}

              <form className={validated ? "was-validated" : ""} noValidate onSubmit={onSubmit}>
                <div className="row">
                  {/* FULL NAME */}
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
                        required
                      />
                      <div className="invalid-feedback">Please enter your name.</div>
                    </div>
                  </div>

                  {/* EMAIL */}
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
                        required
                      />
                      <div className="invalid-feedback">Please enter a valid email.</div>
                    </div>
                  </div>
                </div>

                <div className="row">
                  {/* PHONE NUMBER */}
                  <div className="col-sm-12 mb-3">
                    <label className="form-label">Phone number</label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <Phone size={16} aria-hidden="true" />
                      </span>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="e.g. +880 17XXXXXXXX"
                        value={form.phone}
                        onChange={set("phone")}
                        required
                      />
                      <div className="invalid-feedback">Please enter your phone number.</div>
                    </div>
                  </div>
                </div>

                <div className="row">
                  {/* PASSWORD */}
                  <div className="col-sm-6 mb-3">
                    <label className="form-label">Password</label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <LockKeyhole size={16} aria-hidden="true" />
                      </span>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Min 6 chars"
                        minLength={6}
                        value={form.password}
                        onChange={set("password")}
                        required
                      />
                      <div className="invalid-feedback">At least 6 characters.</div>
                    </div>
                  </div>

                  {/* CONFIRM PASSWORD */}
                  <div className="col-sm-6 mb-3">
                    <label className="form-label">Confirm password</label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <LockKeyhole size={16} aria-hidden="true" />
                      </span>
                      <input
                        type="password"
                        className={`form-control ${validated && !passwordsMatch ? "is-invalid" : ""}`}
                        placeholder="Repeat password"
                        value={form.confirm}
                        onChange={set("confirm")}
                        required
                      />
                      <div className="invalid-feedback">Passwords must match.</div>
                    </div>
                  </div>
                </div>

                {/* CONDITIONAL MOSQUE ADMIN FIELDS */}
                {role === "mosque_admin" && (
                  <div className="card bg-light border-0 p-4 mb-4 mt-2">
                    <h5 className="fw-semibold text-mc mb-3 d-flex align-items-center gap-2">
                      <Building2 size={20} />
                      Mosque Information
                    </h5>

                    <div className="row">
                      {/* ROLE IN MOSQUE */}
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
                            required={role === "mosque_admin"}
                          />
                          <div className="invalid-feedback">Please enter your mosque role.</div>
                        </div>
                      </div>

                      {/* MOSQUE NAME */}
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
                            required={role === "mosque_admin"}
                          />
                          <div className="invalid-feedback">Please enter the mosque name.</div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      {/* MOSQUE ADDRESS */}
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
                          required={role === "mosque_admin"}
                        />
                        <div className="invalid-feedback">Please enter the mosque address.</div>
                      </div>
                    </div>

                    {/* PROOF DOCUMENT FILE UPLOAD */}
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

                {/* TERMS AND CONDITIONS */}
                <div className="form-check mb-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="terms"
                    checked={form.terms}
                    onChange={set("terms")}
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

                <button type="submit" className="btn btn-mc w-100 btn-lg mb-3">
                  {role === "user" ? "Create Account" : "Submit Admin Request"}
                </button>
                <p className="text-center mb-0 small">
                  Already have an account?{" "}
                  <Link to="/login" className="text-mc fw-semibold text-decoration-none">
                    Log in
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
