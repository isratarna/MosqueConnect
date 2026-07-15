import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      setValidated(true);
      return;
    }
    const res = login(email, password);
    if (!res.ok) {
      setError(res.error + " Try the demo account below.");
      return;
    }
    navigate("/");
  };

  return (
    <div className="mc-auth-wrap py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-5">
            <div className="card mc-auth-card p-4 p-sm-5">
              <div className="text-center mb-4">
                <div className="mc-feature-icon mx-auto mb-3"><i className="bi bi-box-arrow-in-right" /></div>
                <h3 className="fw-bold mb-1">Welcome back</h3>
                <p className="text-muted mb-0">Log in to follow mosques and get updates.</p>
              </div>

              <form className={validated ? "was-validated" : ""} noValidate onSubmit={onSubmit}>
                {error && (
                  <div className="alert alert-danger py-2 small">
                    <i className="bi bi-exclamation-triangle me-1" />{error}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Email address</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-envelope" /></span>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      required
                    />
                    <div className="invalid-feedback">Please enter a valid email.</div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-lock" /></span>
                    <input
                      type={showPw ? "text" : "password"}
                      className="form-control"
                      placeholder="••••••••"
                      minLength={6}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      required
                    />
                    <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPw((v) => !v)}>
                      <i className={"bi " + (showPw ? "bi-eye-slash" : "bi-eye")} />
                    </button>
                    <div className="invalid-feedback">Password must be at least 6 characters.</div>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="remember" />
                    <label className="form-check-label small" htmlFor="remember">Remember me</label>
                  </div>
                  <a href="#" className="small text-mc text-decoration-none" onClick={(e) => e.preventDefault()}>
                    Forgot password?
                  </a>
                </div>

                <div className="alert alert-light border small mb-3">
                  <i className="bi bi-info-circle text-mc me-1" />
                  <strong>Demo account:</strong> hello123@gmail.com / hello1234
                </div>

                <button type="submit" className="btn btn-mc w-100 btn-lg mb-3">Log In</button>
                <p className="text-center mb-0 small">
                  Don't have an account?{" "}
                  <Link to="/register" className="text-mc fw-semibold text-decoration-none">Register</Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
