import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, UserPlus, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [validated, setValidated] = useState(false);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const passwordsMatch = form.password === form.confirm;

  const onSubmit = (e) => {
    e.preventDefault();
    const el = e.currentTarget;
    if (!el.checkValidity() || !passwordsMatch) {
      setValidated(true);
      return;
    }
    register(form.name, form.email);
    navigate("/");
  };

  return (
    <div className="mc-auth-wrap py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card mc-auth-card p-4 p-sm-5">
              <div className="text-center mb-4">
                <div className="mc-feature-icon mx-auto mb-3"><UserPlus size={25} aria-hidden="true" /></div>
                <h3 className="fw-bold mb-1">Create your account</h3>
                <p className="text-muted mb-0">Join the community and stay connected to your mosques.</p>
              </div>

              <form className={validated ? "was-validated" : ""} noValidate onSubmit={onSubmit}>
                <div className="mb-3">
                  <label className="form-label">Full name</label>
                  <div className="input-group">
                    <span className="input-group-text"><UserRound size={16} aria-hidden="true" /></span>
                    <input type="text" className="form-control" placeholder="Your name"
                           value={form.name} onChange={set("name")} required />
                    <div className="invalid-feedback">Please enter your name.</div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Email address</label>
                  <div className="input-group">
                    <span className="input-group-text"><Mail size={16} aria-hidden="true" /></span>
                    <input type="email" className="form-control" placeholder="you@example.com"
                           value={form.email} onChange={set("email")} required />
                    <div className="invalid-feedback">Please enter a valid email.</div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-sm-6 mb-3">
                    <label className="form-label">Password</label>
                    <div className="input-group">
                      <span className="input-group-text"><LockKeyhole size={16} aria-hidden="true" /></span>
                      <input type="password" className="form-control" placeholder="Min 6 chars"
                             minLength={6} value={form.password} onChange={set("password")} required />
                      <div className="invalid-feedback">At least 6 characters.</div>
                    </div>
                  </div>
                  <div className="col-sm-6 mb-3">
                    <label className="form-label">Confirm password</label>
                    <div className="input-group">
                      <span className="input-group-text"><LockKeyhole size={16} aria-hidden="true" /></span>
                      <input
                        type="password"
                        className={"form-control" + (validated && !passwordsMatch ? " is-invalid" : "")}
                        placeholder="Repeat password"
                        value={form.confirm}
                        onChange={set("confirm")}
                        required
                      />
                      <div className="invalid-feedback">Passwords must match.</div>
                    </div>
                  </div>
                </div>

                <div className="form-check mb-4">
                  <input className="form-check-input" type="checkbox" id="terms"
                         checked={form.terms} onChange={set("terms")} required />
                  <label className="form-check-label small" htmlFor="terms">
                    I agree to the <a href="#" className="text-mc text-decoration-none" onClick={(e) => e.preventDefault()}>Terms &amp; Privacy Policy</a>.
                  </label>
                  <div className="invalid-feedback">You must accept the terms.</div>
                </div>

                <button type="submit" className="btn btn-mc w-100 btn-lg mb-3">Create Account</button>
                <p className="text-center mb-0 small">
                  Already have an account?{" "}
                  <Link to="/login" className="text-mc fw-semibold text-decoration-none">Log in</Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
