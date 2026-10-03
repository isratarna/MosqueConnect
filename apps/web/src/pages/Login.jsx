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
import { useLocale } from "../hooks/useLocale";
import { bangladeshLocalNumber, bangladeshPhone, isBangladeshMobile } from "../utils/phone";

/** Inline SVG, because Windows does not draw flag emoji (it shows the letters BD). */
// [Urmee · F1 Part 1] Inline SVG because Windows doesn't draw flag emoji (it shows the letters BD).
function BangladeshFlag() {
  return (
    <svg className="me-2" width="22" height="13" viewBox="0 0 10 6" role="img" aria-label="Bangladesh flag">
      <rect width="10" height="6" fill="#006a4e" />
      <circle cx="4.5" cy="3" r="2" fill="#f42a41" />
    </svg>
  );
}

export default function Login({ registering = false }) {
  const { t } = useLocale();
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // [Urmee · F1 Part 1] Only valid Bangladeshi mobile numbers (01[3-9] + 8 digits) are accepted.
    if (!isBangladeshMobile(phone)) {
      setError(t("auth.invalidPhone"));
      return;
    }

    const fullPhone = bangladeshPhone(phone);

    setLoading(true);
    const res = await sendOtp(fullPhone);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || t("auth.sendFailed"));
      return;
    }

    setMessage(res.message || t("auth.otpSent", { phone: fullPhone }));
    setStep("otp");
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedOtp = otp.trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      setError(t("auth.invalidOtp"));
      return;
    }
    if (registering && !termsAccepted) {
      setError("Please accept the Terms of Use and Privacy Policy to create your account.");
      return;
    }

    const fullPhone = bangladeshPhone(phone);

    setLoading(true);
    const res = await verifyOtp(fullPhone, trimmedOtp, { acceptTerms: registering && termsAccepted });
    setLoading(false);

    if (!res.ok) {
      setError(res.error || t("auth.verifyFailed"));
      return;
    }

    if (location.state?.from) {
      navigate(returnPath(location), { replace: true });
    } else if (registering) {
      // [Urmee · F6 Part 3] Same: the Profile tab now comes from the URL.
      navigate("/profile?tab=settings", { replace: true });
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
      setError(res.error || t("auth.resendFailed"));
    } else {
      setMessage(t("auth.resent"));
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
                  {step === "phone" ? (registering ? t("auth.createAccount") : t("auth.welcomeBack")) : t("auth.enterCode")}
                </h3>
                <p className="text-muted mb-0">
                  {step === "phone"
                    ? (registering ? t("auth.registerCopy") : t("auth.loginCopy"))
                    : t("auth.codeSent", { phone: bangladeshPhone(phone) })}
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
                    <label className="form-label" htmlFor="login-phone">{t("auth.phoneLabel")}</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light fw-semibold d-flex align-items-center" id="login-phone-prefix"><BangladeshFlag /> +880</span>
                      <input
                        id="login-phone"
                        autoComplete="tel-national"
                        type="tel"
                        inputMode="numeric"
                        className="form-control flex-grow-1"
                        placeholder={t("auth.phonePlaceholder")}
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
                      {t("auth.phoneHelp")}
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
                        <span>{t("auth.sendingOtp")}</span>
                      </>
                    ) : (
                      t("auth.sendOtp")
                    )}
                  </button>

                  <p className="text-center mb-0 small">
                    {registering ? t("auth.haveAccount") : t("auth.noAccount")}
                    <Link to={registering ? "/login" : "/register"} state={location.state} className="text-mc fw-semibold text-decoration-none">
                      {registering ? t("auth.login") : t("auth.register")}
                    </Link>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} noValidate>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="login-otp">{t("auth.otpLabel")}</label>
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
                        placeholder={t("auth.otpPlaceholder")}
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

                  {registering && (
                    <div className="form-check mb-3">
                      <input
                        id="login-accept-terms"
                        className="form-check-input"
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(event) => setTermsAccepted(event.target.checked)}
                        disabled={loading}
                      />
                      <label className="form-check-label small" htmlFor="login-accept-terms">
                        I agree to the <Link to="/terms" target="_blank" className="text-mc">Terms of Use</Link> and <Link to="/privacy" target="_blank" className="text-mc">Privacy Policy</Link>.
                      </label>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-mc w-100 btn-lg mb-3 d-flex align-items-center justify-content-center gap-2"
                    disabled={loading || !otp.trim() || (registering && !termsAccepted)}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        <span>{t("auth.verifying")}</span>
                      </>
                    ) : (
                      t("auth.verify")
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
                      {t("auth.changePhone")}
                    </button>

                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none text-mc fw-semibold d-flex align-items-center gap-1"
                      onClick={handleResendOtp}
                      disabled={loading}
                    >
                      <RotateCcw size={14} />
                      {t("auth.resend")}
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
