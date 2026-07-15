import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile collapse

  const close = () => setOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate("/");
  };

  const navLinkClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

  return (
    <nav className="navbar navbar-expand-lg navbar-dark mc-navbar sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/" onClick={close}>
          <i className="bi bi-geo-alt-fill me-1" />
          Mosque<span className="mc-brand-accent">Connect</span>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={"collapse navbar-collapse" + (open ? " show" : "")}>
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-1">
            <li className="nav-item">
              <NavLink end className={navLinkClass} to="/" onClick={close}>Home</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={navLinkClass} to="/browse" onClick={close}>Browse Mosques</NavLink>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/#support" onClick={close}>Support</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/#about" onClick={close}>Community</a>
            </li>

            {!user ? (
              <>
                <li className="nav-item ms-lg-2">
                  <Link className="btn btn-outline-light btn-sm" to="/login" onClick={close}>Login</Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-warning btn-sm text-dark fw-semibold" to="/register" onClick={close}>
                    Register
                  </Link>
                </li>
              </>
            ) : (
              <>
                <NotificationBell />
                <ProfileMenu user={user} onLogout={handleLogout} />
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

function NotificationBell() {
  const [show, setShow] = useState(false);
  return (
    <li className="nav-item dropdown ms-lg-2">
      <a
        className="nav-link position-relative"
        href="#"
        role="button"
        title="Notifications"
        onClick={(e) => { e.preventDefault(); setShow((v) => !v); }}
      >
        <i className="bi bi-bell fs-5" />
      </a>
      <div className={"dropdown-menu dropdown-menu-end shadow mc-notif-menu p-0" + (show ? " show" : "")}>
        <div className="px-3 py-2 border-bottom">
          <strong className="small">Notifications</strong>
        </div>
        <div className="text-center text-muted py-4 px-3">
          <i className="bi bi-bell-slash fs-4 d-block mb-2 opacity-50" />
          <span className="small">No notifications yet.</span>
        </div>
      </div>
    </li>
  );
}

function ProfileMenu({ user, onLogout }) {
  const [show, setShow] = useState(false);
  return (
    <li className="nav-item dropdown">
      <a
        className="nav-link dropdown-toggle d-flex align-items-center"
        href="#"
        role="button"
        aria-expanded={show}
        onClick={(e) => { e.preventDefault(); setShow((v) => !v); }}
      >
        <i className="bi bi-person-circle fs-5 me-1" />
        <span>{user.name}</span>
      </a>
      <ul className={"dropdown-menu dropdown-menu-end" + (show ? " show" : "")}>
        <li><a className="dropdown-item" href="#" onClick={(e) => e.preventDefault()}><i className="bi bi-person me-2" />My Profile</a></li>
        <li><a className="dropdown-item" href="#" onClick={(e) => e.preventDefault()}><i className="bi bi-star me-2" />Followed Mosques</a></li>
        <li><hr className="dropdown-divider" /></li>
        <li>
          <a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); onLogout(); }}>
            <i className="bi bi-box-arrow-right me-2" />Logout
          </a>
        </li>
      </ul>
    </li>
  );
}
