import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, BellOff, Heart, LogOut, Menu, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/Logo.png";

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
        <Link className="navbar-brand mc-brand me-2 me-lg-0" to="/" onClick={close}>
          <img src={logo} alt="MosqueConnect logo" className="mc-brand-logo me-2" />
          <span className="mc-brand-title">
            Mosque<span className="mc-brand-accent">Connect</span>
          </span>
        </Link>
        <button
          className="navbar-toggler ms-2 ms-lg-0"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Menu size={20} aria-hidden="true" />
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
              <NavLink className={navLinkClass} to="/support" onClick={close}>Support</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={navLinkClass} to="/community" onClick={close}>Community</NavLink>
            </li>

            {!user ? (
              <>
                <li className="nav-item ms-lg-2 mt-1 mt-lg-0">
                  <Link className="btn btn-outline-mc btn-sm w-100 w-lg-auto" to="/login" onClick={close}>Login</Link>
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
        <Bell size={18} aria-hidden="true" />
      </a>
      <div
        ref={dropdownRef}
        className={"dropdown-menu dropdown-menu-end shadow mc-notif-menu p-0" + (isOpen ? " show" : "")}
      >
        <div className="px-3 py-2 border-bottom">
          <strong className="small">Notifications</strong>
        </div>
        <div className="text-center text-muted py-4 px-3">
          <BellOff size={24} className="d-block mx-auto mb-2 opacity-50" aria-hidden="true" />
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

  const isAdminApproved = user.role === "mosque_admin" && user.status === "approved";
  const isAdminPending = user.role === "mosque_admin" && user.status === "pending";

  return (
    <li className="nav-item dropdown" ref={wrapperRef}>
      <a
        className="nav-link dropdown-toggle d-flex align-items-center"
        href="#"
        role="button"
        aria-expanded={isOpen}
        onClick={(e) => { e.preventDefault(); onToggle(); }}
      >
        <UserRound size={18} className="me-1" aria-hidden="true" />
        <span>
          {user.name}
          {isAdminApproved && (
            <span className="badge bg-success-subtle text-success border border-success-subtle ms-1" style={{ fontSize: "10px" }}>
              Admin
            </span>
          )}
          {isAdminPending && (
            <span className="badge bg-warning-subtle text-warning border border-warning-subtle text-dark ms-1" style={{ fontSize: "10px" }}>
              Pending
            </span>
          )}
        </span>
      </a>
      <ul
        ref={dropdownRef}
        className={"dropdown-menu dropdown-menu-end" + (isOpen ? " show" : "")}
      >
        {/* User identity header */}
        <li className="px-3 py-2 border-bottom">
          <div className="fw-bold small">{user.fullName || user.name}</div>
          <div className="text-muted" style={{ fontSize: "11px" }}>
            {user.role === "mosque_admin" ? (
              <div className="mt-0.5">
                <div>Admin: <strong>{user.mosqueName}</strong></div>
                <div className="mt-1">
                  Status:{" "}
                  <span className={`badge py-0.5 px-1 bg-${user.status === "approved" ? "success" : user.status === "rejected" ? "danger" : "warning text-dark"}`}>
                    {user.status}
                  </span>
                </div>
              </div>
            ) : (
              <span>Community Member</span>
            )}
          </div>
        </li>

        <li>
          <Link className="dropdown-item d-flex align-items-center" to="/profile" onClick={onClose}>
            <UserRound size={15} className="me-2" aria-hidden="true" />My Profile
          </Link>
        </li>
        <li>
          <Link className="dropdown-item d-flex align-items-center" to="/profile" onClick={onClose}>
            <Heart size={15} className="me-2" aria-hidden="true" />Followed Mosques
          </Link>
        </li>

        {isAdminApproved && (
          <>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <Link className="dropdown-item d-flex align-items-center text-success fw-bold" to="/admin/dashboard" onClick={onClose}>
                <Landmark size={15} className="me-2" aria-hidden="true" />Mosque Dashboard
              </Link>
            </li>
          </>
        )}

        <li><hr className="dropdown-divider" /></li>
        <li>
          <button
            type="button"
            className="dropdown-item d-flex align-items-center text-danger"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLogout();
            }}
          >
            <LogOut size={15} className="me-2" aria-hidden="true" />Logout
          </button>
        </li>
      </ul>
    </li>
  );
}
