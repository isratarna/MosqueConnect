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
import { internationalPhone, returnPath } from "../utils/api";
import { useLocale } from "../hooks/useLocale";

export default function Login({ registering = false }) {
  const { t } = useLocale();
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [countryCode, setCountryCode] = useState("+880");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const localPhone = phone.replace(/\D/g, "");
    if (!localPhone || localPhone.length < 6 || localPhone.length > 15) {
      setError(t("auth.invalidPhone"));
      return;
    }

    const fullPhone = internationalPhone(countryCode, localPhone);

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

    const localPhone = phone.replace(/\D/g, "");
    const fullPhone = internationalPhone(countryCode, localPhone);

    setLoading(true);
    const res = await verifyOtp(fullPhone, trimmedOtp);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || t("auth.verifyFailed"));
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
    
    const localPhone = phone.replace(/\D/g, "");
    const fullPhone = internationalPhone(countryCode, localPhone);
    
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
                    : t("auth.codeSent", { phone: internationalPhone(countryCode, phone) })}
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
                      <select 
                        className="form-select bg-light border-end-0" 
                        style={{ maxWidth: '120px', flex: '0 0 120px', cursor: 'pointer' }}
                        value={countryCode}
                        onChange={(e) => {
                          setCountryCode(e.target.value);
                          setError("");
                        }}
                        disabled={loading}
                        aria-label={t("auth.countryCode")}
                      >
                        <option value="+880">🇧🇩 +880</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="+966">🇸🇦 +966</option>
                        <option value="+60">🇲🇾 +60</option>
                      </select>
                      <input
                        id="login-phone"
                        autoComplete="tel-national"
                        type="tel"
                        className="form-control flex-grow-1"
                        placeholder={t("auth.phonePlaceholder")}
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value.replace(/\D/g, ""));
                          setError("");
                        }}
                        disabled={loading}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="form-text text-muted small">
                      {t("auth.phoneHelp")}
                    </div>
                  </div>

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

                  <button
                    type="submit"
                    className="btn btn-mc w-100 btn-lg mb-3 d-flex align-items-center justify-content-center gap-2"
                    disabled={loading || !otp.trim()}
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
