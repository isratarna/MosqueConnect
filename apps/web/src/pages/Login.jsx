import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  KeyRound,
  LogIn,
  Phone,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { returnPath } from "../utils/api";
import { bangladeshLocalNumber, bangladeshPhone, isBangladeshMobile } from "../utils/phone";

/** Inline SVG, because Windows does not draw flag emoji (it shows the letters BD). */
function BangladeshFlag() {
  return (
    <svg className="me-2" width="22" height="13" viewBox="0 0 10 6" role="img" aria-label="Bangladesh flag">
      <rect width="10" height="6" fill="#006a4e" />
      <circle cx="4.5" cy="3" r="2" fill="#f42a41" />
    </svg>
  );
}

export default function Login({ registering = false }) {
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!isBangladeshMobile(phone)) {
      setError("Please enter a valid Bangladeshi mobile number, e.g. 01712345678.");
      return;
    }

    const fullPhone = bangladeshPhone(phone);

    setLoading(true);
    const res = await sendOtp(fullPhone);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Failed to send OTP. Please check your phone number format.");
      return;
    }

    setMessage(res.message || `OTP sent successfully to ${fullPhone}.`);
    setStep("otp");
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedOtp = otp.trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    const fullPhone = bangladeshPhone(phone);

    setLoading(true);
    const res = await verifyOtp(fullPhone, trimmedOtp);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Invalid or expired OTP. Please try again.");
      return;
    }

    if (location.state?.from) {
      navigate(returnPath(location), { replace: true });
    } else if (registering) {
      navigate("/profile", { replace: true, state: { tab: "settings" } });
    } else if (res.user?.role === "super_admin") {
      navigate("/super-admin/dashboard");
    } else if (res.user?.role === "mosque_admin" && res.user?.status === "approved") {
      navigate("/admin/dashboard");
    } else {
      navigate("/");
    }
  };

  const handleResendOtp = async () => {
    if (loading) return;
    setError("");
    
    const fullPhone = bangladeshPhone(phone);
    
    setLoading(true);
    const res = await sendOtp(fullPhone);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Failed to resend OTP. Please try again later.");
    } else {
      setMessage("A new OTP has been sent to your phone.");
    }
  };

  const handleChangePhone = () => {
    setStep("phone");
    setOtp("");
    setError("");
    setMessage("");
  };

  return (
    <div className="mc-auth-wrap py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-5">
            <div className="card mc-auth-card p-4 p-sm-5 mc-motion-section">
              <div className="text-center mb-4">
                <div className="mc-feature-icon mx-auto mb-3">
                  <LogIn size={25} aria-hidden="true" />
                </div>
                <h3 className="fw-bold mb-1">
                  {step === "phone" ? (registering ? "Create your account" : "Welcome back") : "Enter Verification Code"}
                </h3>
                <p className="text-muted mb-0">
                  {step === "phone"
                    ? (registering ? "Verify your phone to create an account, then complete your profile. Mosque administrators can apply from a mosque profile." : "Log in using your phone number and OTP.")
                    : `We sent a 6-digit code to ${bangladeshPhone(phone)}.`}
                </p>
              </div>

              {error && (
                <div className="alert alert-danger py-2 small d-flex align-items-center mb-3">
                  <CircleAlert size={16} className="me-2 flex-shrink-0" aria-hidden="true" />
                  <div>{error}</div>
                </div>
              )}

              {message && !error && (
                <div className="alert alert-success py-2 small d-flex align-items-center mb-3">
                  <CheckCircle2 size={16} className="me-2 flex-shrink-0" aria-hidden="true" />
                  <div>{message}</div>
                </div>
              )}

              {step === "phone" ? (
                <form onSubmit={handleSendOtp} noValidate>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="login-phone">Phone Number</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light fw-semibold d-flex align-items-center" id="login-phone-prefix"><BangladeshFlag /> +880</span>
                      <input
                        id="login-phone"
                        autoComplete="tel-national"
                        type="tel"
                        inputMode="numeric"
                        className="form-control flex-grow-1"
                        placeholder="1712345678"
                        aria-describedby="login-phone-prefix login-phone-help"
                        value={phone}
                        onChange={(e) => {
                          // 017…, +88017… and 88017… all become 17…
                          setPhone(bangladeshLocalNumber(e.target.value));
                          setError("");
                        }}
                        disabled={loading}
                        required
                        autoFocus
                      />
                    </div>
                    <div id="login-phone-help" className="form-text text-muted small">
                      Enter your Bangladeshi mobile number, e.g. 01712345678.
                    </div>
                  </div>

                  {registering && (
                    <p className="small text-muted mb-3">
                      By continuing you agree to the <Link to="/terms" target="_blank" className="text-mc">Terms of Use</Link> and <Link to="/privacy" target="_blank" className="text-mc">Privacy Policy</Link>.
                    </p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-mc w-100 btn-lg mb-3 d-flex align-items-center justify-content-center gap-2"
                    disabled={loading || !phone.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </button>

                  <p className="text-center mb-0 small">
                    {registering ? "Already have an account? " : "Don't have an account? "}
                    <Link to={registering ? "/login" : "/register"} state={location.state} className="text-mc fw-semibold text-decoration-none">
                      {registering ? "Log in" : "Register"}
                    </Link>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} noValidate>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="login-otp">Verification Code (OTP)</label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <KeyRound size={16} aria-hidden="true" />
                      </span>
                      <input
                        id="login-otp"
                        autoComplete="one-time-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        className="form-control"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value.replace(/\D/g, ""));
                          setError("");
                        }}
                        disabled={loading}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-mc w-100 btn-lg mb-3 d-flex align-items-center justify-content-center gap-2"
                    disabled={loading || !otp.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      "Verify OTP"
                    )}
                  </button>

                  <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top small">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none text-muted d-flex align-items-center gap-1"
                      onClick={handleChangePhone}
                      disabled={loading}
                    >
                      <ArrowLeft size={14} />
                      Change phone
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
