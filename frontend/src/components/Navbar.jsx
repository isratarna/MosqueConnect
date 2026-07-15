import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile collapse
  const [activeDropdown, setActiveDropdown] = useState(null);

  const close = () => setOpen(false);
  const closeDropdowns = () => setActiveDropdown(null);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && activeDropdown) {
        closeDropdowns();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activeDropdown]);

  const handleLogout = () => {
    logout();
    close();
    closeDropdowns();
    navigate("/");
  };

  const navLinkClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

  return (
    <nav className="navbar navbar-expand-lg navbar-dark mc-navbar sticky-top">
      <div className="container px-3 px-lg-0">
        <Link className="navbar-brand fw-bold me-2 me-lg-0" to="/" onClick={close}>
          <i className="bi bi-geo-alt-fill me-1" />
          Mosque<span className="mc-brand-accent">Connect</span>
        </Link>
        <button
          className="navbar-toggler ms-2 ms-lg-0"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={"collapse navbar-collapse mt-1 mt-lg-0" + (open ? " show" : "")}>
          <ul className="navbar-nav ms-auto align-items-start align-items-lg-center gap-1 gap-lg-1 py-1 py-lg-0">
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
                <li className="nav-item ms-lg-2 mt-1 mt-lg-0">
                  <Link className="btn btn-outline-light btn-sm w-100 w-lg-auto" to="/login" onClick={close}>Login</Link>
                </li>
                <li className="nav-item mt-1 mt-lg-0">
                  <Link className="btn btn-warning btn-sm text-dark fw-semibold w-100 w-lg-auto" to="/register" onClick={close}>
                    Register
                  </Link>
                </li>
              </>
            ) : (
              <>
                <NotificationBell
                  isOpen={activeDropdown === "notifications"}
                  onToggle={() => setActiveDropdown((current) => (current === "notifications" ? null : "notifications"))}
                  onClose={closeDropdowns}
                />
                <ProfileMenu
                  user={user}
                  onLogout={handleLogout}
                  isOpen={activeDropdown === "profile"}
                  onToggle={() => setActiveDropdown((current) => (current === "profile" ? null : "profile"))}
                  onClose={closeDropdowns}
                />
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

function NotificationBell({ isOpen, onToggle, onClose }) {
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <li className="nav-item dropdown ms-lg-2" ref={wrapperRef}>
      <a
        className="nav-link position-relative"
        href="#"
        role="button"
        title="Notifications"
        onClick={(e) => { e.preventDefault(); onToggle(); }}
      >
        <i className="bi bi-bell fs-5" />
      </a>
      <div
        ref={dropdownRef}
        className={"dropdown-menu dropdown-menu-end shadow mc-notif-menu p-0" + (isOpen ? " show" : "")}
      >
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

function ProfileMenu({ user, onLogout, isOpen, onToggle, onClose }) {
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <li className="nav-item dropdown" ref={wrapperRef}>
      <a
        className="nav-link dropdown-toggle d-flex align-items-center"
        href="#"
        role="button"
        aria-expanded={isOpen}
        onClick={(e) => { e.preventDefault(); onToggle(); }}
      >
        <i className="bi bi-person-circle fs-5 me-1" />
        <span>{user.name}</span>
      </a>
      <ul
        ref={dropdownRef}
        className={"dropdown-menu dropdown-menu-end" + (isOpen ? " show" : "")}
      >
        <li>
          <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onClose(); }}>
            <i className="bi bi-person me-2" />My Profile
          </a>
        </li>
        <li>
          <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onClose(); }}>
            <i className="bi bi-star me-2" />Followed Mosques
          </a>
        </li>
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
