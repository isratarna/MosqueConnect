import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Heart, Landmark, LogOut, Menu, ShieldCheck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";

import LanguageSwitcher from "./LanguageSwitcher";
import { statusLabel } from "../utils/labels";
import NotificationList from "./notifications/NotificationList";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { fetchNotifications } from "../utils/notificationApi";
import { getNotificationPath, isNotificationRead } from "../utils/notificationUtils";
import logo from "../assets/Logo.png";

const NAVBAR_NOTIFICATION_LIMIT = 6;

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile collapse
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

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

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  const handleLogout = () => {
    logout();
    close();
    closeDropdowns();
    navigate("/");
  };

  const navLinkClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

  return (
    <nav className={`navbar navbar-expand-lg navbar-dark mc-navbar sticky-top${isScrolled ? " is-scrolled" : ""}`}>
      <div className="container px-3 px-lg-0">
        <Link className="navbar-brand mc-brand me-2 me-lg-0" to="/" onClick={close}>
          <img src={logo} alt={t('common.logoAlt')} className="mc-brand-logo me-2" />
          <span className="mc-brand-title">
            Mosque<span className="mc-brand-accent">Connect</span>
          </span>
        </Link>
        <button
          className="navbar-toggler ms-2 ms-lg-0"
          type="button"
          aria-label={t('common.toggleNavigation')}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className={"collapse navbar-collapse mt-1 mt-lg-0" + (open ? " show" : "")}>
          <ul className="navbar-nav ms-auto align-items-start align-items-lg-center gap-1 gap-lg-1 py-1 py-lg-0">
            <li className="nav-item">
              <NavLink end className={navLinkClass} to="/" onClick={close}>{t('nav.home')}</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={navLinkClass} to="/browse" onClick={close}>{t('nav.browse')}</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={navLinkClass} to="/support" onClick={close}>{t('nav.support')}</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={navLinkClass} to="/campaigns" onClick={close}>{t('nav.campaigns')}</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={navLinkClass} to="/community" onClick={close}>{t('nav.community')}</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={navLinkClass} to="/blood-donation" onClick={close}>{t('nav.bloodDonation')}</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={navLinkClass} to="/volunteers" onClick={close}>{t('nav.volunteers')}</NavLink>
            </li>

            <li className="nav-item ms-lg-3 mt-1 mt-lg-0 me-2">
              <LanguageSwitcher />
            </li>

            {!user ? (
              <>
                <li className="nav-item ms-lg-2 mt-1 mt-lg-0">
                  <Link className="btn btn-outline-mc btn-sm w-100 w-lg-auto" to="/login" onClick={close}>{t('nav.login')}</Link>
                </li>
                <li className="nav-item mt-1 mt-lg-0">
                  <Link className="btn btn-warning btn-sm text-dark fw-semibold w-100 w-lg-auto" to="/register" onClick={close}>
                    {t('nav.register')}
                  </Link>
                </li>
              </>
            ) : (
              <>
                <NotificationBell
                  isOpen={activeDropdown === "notifications"}
                  onToggle={() => setActiveDropdown((current) => (current === "notifications" ? null : "notifications"))}
                  onClose={closeDropdowns}
                  onNavigate={() => { close(); closeDropdowns(); }}
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
      <span className="mc-navbar__progress" aria-hidden="true" />
    </nav>
  );
}

function NotificationBell({ isOpen, onToggle, onClose, onNavigate }) {
  const { t } = useTranslation();
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const {
    unreadCount,
    unreadLoading,
    readChange,
    markAsRead,
    markAllAsRead,
    handleRequestError,
  } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadNotifications = useCallback((signal) => {
    setLoading(true);
    setError("");

    return fetchNotifications({ page: 1, perPage: NAVBAR_NOTIFICATION_LIMIT, signal })
      .then(({ notifications: items }) => setNotifications(items))
      .catch((requestError) => {
        if (requestError.name === "AbortError") return;
        handleRequestError(requestError);
        setError(requestError.message || t('notification.loadError'));
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, [handleRequestError, t]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const controller = new AbortController();
    loadNotifications(controller.signal);
    return () => controller.abort();
  }, [isOpen, loadNotifications, reloadKey]);

  useEffect(() => {
    if (!readChange) return;
    setNotifications((current) => current.map((notification) => (
      readChange.kind === "all" || notification.id === readChange.id
        ? { ...notification, ...(readChange.notification || {}), is_read: 1 }
        : notification
    )));
  }, [readChange]);

  useEffect(() => {
    if (!isOpen) return undefined;

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
  }, [isOpen, onClose]);

  const handleSelect = async (notification) => {
    const wasUnread = !isNotificationRead(notification);
    const destination = getNotificationPath(notification);
    setActionError("");

    if (wasUnread) {
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, is_read: 1 } : item
      )));

      try {
        await markAsRead(notification.id);
      } catch (requestError) {
        setNotifications((current) => current.map((item) => (
          item.id === notification.id ? { ...item, is_read: 0 } : item
        )));
        setActionError(requestError.message || t('notification.markReadError'));
      }
    }

    if (destination) {
      onNavigate();
      navigate(destination);
    }
  };

  const handleMarkAll = async () => {
    const previous = notifications;
    setMarkingAll(true);
    setActionError("");
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: 1 })));

    try {
      await markAllAsRead();
    } catch (requestError) {
      setNotifications(previous);
      setActionError(requestError.message || t('notification.markAllReadError'));
    } finally {
      setMarkingAll(false);
    }
  };

  const displayCount = unreadCount > 99 ? "99+" : unreadCount;
  const hasUnread = unreadCount > 0 || notifications.some((notification) => !isNotificationRead(notification));

  return (
    <li className="nav-item dropdown ms-lg-2" ref={wrapperRef}>
      <button
        type="button"
        className="nav-link mc-notification-trigger position-relative"
        title={t('notification.title')}
        aria-label={unreadCount ? t('notification.ariaLabelUnread', { unread: unreadCount }) : t('notification.title')}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={onToggle}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && <span className="mc-notification-badge" aria-hidden="true">{displayCount}</span>}
        {unreadLoading && <span className="visually-hidden" role="status">{t('notification.loadingUnread')}</span>}
      </button>
      <div
        ref={dropdownRef}
        data-bs-popper="static"
        className={"dropdown-menu dropdown-menu-end shadow mc-notif-menu p-0" + (isOpen ? " show" : "")}
      >
        <div className="mc-notif-menu__header">
          <div>
            <strong>{t('notification.title')}</strong>
            {unreadCount > 0 && <span>{t('notification.unreadCount', { unread: unreadCount })}</span>}
          </div>
          <button
            type="button"
            className="mc-notif-menu__read-all"
            onClick={handleMarkAll}
            disabled={!hasUnread || markingAll}
          >
            <CheckCheck size={14} aria-hidden="true" />
            {markingAll ? t('notification.marking') : t('notification.markAllRead')}
          </button>
        </div>
        {actionError && <div className="mc-notif-menu__error" role="alert">{actionError}</div>}
        <div className="mc-notif-menu__body">
          <NotificationList
            notifications={notifications}
            loading={loading}
            error={error}
            onRetry={() => setReloadKey((current) => current + 1)}
            onSelect={handleSelect}
            compact
          />
        </div>
        <div className="mc-notif-menu__footer">
          <Link to="/notifications" onClick={onNavigate}>{t('notification.viewAll')}</Link>
        </div>
      </div>
    </li>
  );
}

function ProfileMenu({ user, onLogout, isOpen, onToggle, onClose }) {
  const { t } = useTranslation();
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

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
  }, [isOpen, onClose]);

  const isAdminApproved = user.role === "mosque_admin" && user.status === "approved";
  const isAdminPending = user.role === "mosque_admin" && user.status === "pending";
  const isSuperAdmin = user.role === "super_admin";

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
              {t('profile.admin')}
            </span>
          )}
          {isAdminPending && (
            <span className="badge bg-warning-subtle text-warning border border-warning-subtle text-dark ms-1" style={{ fontSize: "10px" }}>
              {t('profile.pending')}
            </span>
          )}
          {isSuperAdmin && (
            <span className="badge bg-danger-subtle text-danger border border-danger-subtle ms-1" style={{ fontSize: "10px" }}>
              {t('profile.superAdmin')}
            </span>
          )}
        </span>
      </a>
      <ul
        ref={dropdownRef}
        className={"dropdown-menu dropdown-menu-end" + (isOpen ? " show" : "")}
      >
        <li className="px-3 py-2 border-bottom">
          <div className="fw-bold small">{user.fullName || user.name}</div>
          <div className="text-muted" style={{ fontSize: "11px" }}>
            {isSuperAdmin ? (
              <span>{t('profile.systemAdministrator')}</span>
            ) : user.role === "mosque_admin" ? (
              <div className="mt-0.5">
                <div>{t('profile.adminLabel')}: <strong>{user.mosqueName}</strong></div>
                <div className="mt-1">
                  {t('profile.status')}:{" "}
                  <span className={`badge py-0.5 px-1 bg-${user.status === "approved" ? "success" : user.status === "rejected" ? "danger" : "warning text-dark"}`}>
                    {statusLabel(t, user.status)}
                  </span>
                </div>
              </div>
            ) : (
              <span>{t('profile.communityMember')}</span>
            )}
          </div>
        </li>

        <li>
          <Link className="dropdown-item d-flex align-items-center" to="/profile" onClick={onClose}>
            <UserRound size={15} className="me-2" aria-hidden="true" />{t('profile.myProfile')}
          </Link>
        </li>
        <li>
          <Link className="dropdown-item d-flex align-items-center" to="/profile" onClick={onClose}>
            <Heart size={15} className="me-2" aria-hidden="true" />{t('profile.followedMosques')}
          </Link>
        </li>

        {isAdminApproved && (
          <>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <Link className="dropdown-item d-flex align-items-center text-success fw-bold" to="/admin/dashboard" onClick={onClose}>
                <Landmark size={15} className="me-2" aria-hidden="true" />{t('profile.mosqueDashboard')}
              </Link>
            </li>
          </>
        )}

        {isSuperAdmin && (
          <>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <Link className="dropdown-item d-flex align-items-center text-danger fw-bold" to="/super-admin/dashboard" onClick={onClose}>
                <ShieldCheck size={15} className="me-2" aria-hidden="true" />{t('profile.systemDashboard')}
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
            <LogOut size={15} className="me-2" aria-hidden="true" />{t('profile.logout')}
          </button>
        </li>
      </ul>
    </li>
  );
}