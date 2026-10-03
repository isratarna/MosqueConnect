import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ChevronDown, ChevronRight, Heart, Landmark, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";
import { statusLabel } from "../utils/labels";
import NotificationList from "./notifications/NotificationList";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { fetchNotifications } from "../utils/notificationApi";
import { getNotificationPath, isNotificationRead } from "../utils/notificationUtils";
import logo from "../assets/Logo.png";

const NAVBAR_NOTIFICATION_LIMIT = 6;

// Links shown in the bar itself.
const PRIMARY_LINKS = [
  { to: "/", end: true, labelKey: "nav.home" },
  { to: "/browse", labelKey: "nav.browse" },
  { to: "/campaigns", labelKey: "nav.campaigns" },
  { to: "/blood-donation", labelKey: "nav.bloodDonation" },
  { to: "/volunteers", labelKey: "nav.volunteers" },
];

// Links tucked into "More" on a wide screen (and listed in full in the mobile menu).
// Help goes to the contact form on the home page.
const MORE_LINKS = [
  { to: "/community", labelKey: "nav.community" },
  { to: { pathname: "/", hash: "#about" }, labelKey: "nav.help", isHash: true },
];

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false); // mobile menu
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const moreRef = useRef(null);

  const close = () => setOpen(false);
  const closeDropdowns = () => setActiveDropdown(null);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        if (activeDropdown) closeDropdowns();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activeDropdown]);

  useEffect(() => {
    if (activeDropdown !== "more") return undefined;

    const handleClickOutside = (event) => {
      if (moreRef.current && !moreRef.current.contains(event.target)) setActiveDropdown(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  // Changing page closes the menus.
  useEffect(() => {
    setOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    close();
    closeDropdowns();
    navigate("/");
  };

  const navLinkClass = ({ isActive }) => "mc-nav-link" + (isActive ? " is-active" : "");
  const moreActive = pathname.startsWith("/community");
  const toggleDropdown = (name) => setActiveDropdown((current) => (current === name ? null : name));

  return (
    <nav className={`mc-navbar sticky-top${isScrolled ? " is-scrolled" : ""}`}>
      <div className="container px-3 px-lg-0 mc-navbar__bar">
        <Link className="navbar-brand mc-brand" to="/" onClick={close}>
          <img src={logo} alt={t('common.logoAlt')} className="mc-brand-logo me-2" />
          <span className="mc-brand-title">
            Mosque<span className="mc-brand-accent">Connect</span>
          </span>
        </Link>

        {/* Wide screens: the links, then "More". */}
        <ul className="mc-nav-links d-none d-lg-flex">
          {PRIMARY_LINKS.map(({ to, end, labelKey }) => (
            <li key={to}>
              <NavLink end={end} className={navLinkClass} to={to}>{t(labelKey)}</NavLink>
            </li>
          ))}
          <li className="mc-nav-more" ref={moreRef}>
            <button
              type="button"
              className={"mc-nav-more__trigger" + (moreActive || activeDropdown === "more" ? " is-active" : "")}
              aria-expanded={activeDropdown === "more"}
              aria-haspopup="true"
              onClick={() => toggleDropdown("more")}
            >
              {t("nav.more")} <ChevronDown size={14} aria-hidden="true" />
            </button>
            <ul className={"dropdown-menu mc-nav-more__menu" + (activeDropdown === "more" ? " show" : "")}>
              {MORE_LINKS.map(({ to, labelKey }) => (
                <li key={labelKey}>
                  <Link className="dropdown-item" to={to} onClick={closeDropdowns}>{t(labelKey)}</Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>

        <div className="mc-nav-actions">
          <div className="d-none d-lg-block"><LanguageSwitcher /></div>

          {user ? (
            <>
              <span className="mc-nav-divider d-none d-lg-block" aria-hidden="true" />
              <NotificationBell
                isOpen={activeDropdown === "notifications"}
                onToggle={() => toggleDropdown("notifications")}
                onClose={closeDropdowns}
                onNavigate={() => { close(); closeDropdowns(); }}
              />
              <div className="d-none d-lg-block">
                <ProfileMenu
                  user={user}
                  onLogout={handleLogout}
                  isOpen={activeDropdown === "profile"}
                  onToggle={() => toggleDropdown("profile")}
                  onClose={closeDropdowns}
                />
              </div>
            </>
          ) : (
            <div className="d-none d-lg-flex align-items-center gap-2">
              <ThemeSwitcher />
              <Link className="btn btn-outline-mc btn-sm" to="/login">{t('nav.login')}</Link>
              <Link className="btn btn-warning btn-sm text-dark fw-semibold" to="/register">{t('nav.register')}</Link>
            </div>
          )}

          <button
            className="mc-nav-toggle d-lg-none"
            type="button"
            aria-label={t('common.toggleNavigation')}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Small screens: a full-height menu. */}
      {open && (
        <div className="mc-mobile-menu d-lg-none">
          <ul className="mc-mobile-menu__links">
            {[...PRIMARY_LINKS, ...MORE_LINKS].map(({ to, end, labelKey, isHash }) => (
              <li key={labelKey}>
                {isHash ? (
                  <Link className="mc-nav-link" to={to} onClick={close}>{t(labelKey)}</Link>
                ) : (
                  <NavLink end={end} className={navLinkClass} to={to} onClick={close}>{t(labelKey)}</NavLink>
                )}
              </li>
            ))}
          </ul>

          <div className="mc-mobile-menu__settings">
            <div className="mc-mobile-menu__row">
              <span>{t("nav.language")}</span>
              <LanguageSwitcher />
            </div>
            <div className="mc-mobile-menu__row">
              <span>{t("nav.appearance")}</span>
              <ThemeSwitcher />
            </div>
          </div>

          {user ? (
            <div className="mc-mobile-menu__account">
              <Link to="/profile" className="mc-account-card" onClick={close}>
                <span className="mc-avatar" aria-hidden="true"><UserRound size={20} /></span>
                <span className="mc-account-card__text">
                  <small>{t("nav.signedInAs")}</small>
                  <strong>{user.phone || user.name}</strong>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
              <button type="button" className="mc-mobile-menu__logout" onClick={handleLogout}>
                <LogOut size={15} aria-hidden="true" /> {t("profile.logout")}
              </button>
            </div>
          ) : (
            <div className="mc-mobile-menu__account mc-mobile-menu__auth">
              <Link className="btn btn-outline-mc" to="/login" onClick={close}>{t("nav.login")}</Link>
              <Link className="btn btn-warning text-dark fw-semibold" to="/register" onClick={close}>{t("nav.register")}</Link>
            </div>
          )}
        </div>
      )}
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
    <div className="dropdown mc-nav-bell" ref={wrapperRef}>
      <button
        type="button"
        className="mc-notification-trigger position-relative"
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
    </div>
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
  const isSuperAdmin = user.role === "super_admin";

  return (
    <div className="dropdown mc-account" ref={wrapperRef}>
      <button
        type="button"
        className="mc-account__trigger"
        aria-label={user.name}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={onToggle}
      >
        <span className="mc-avatar" aria-hidden="true"><UserRound size={16} /></span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <ul
        ref={dropdownRef}
        className={"dropdown-menu dropdown-menu-end mc-account__menu" + (isOpen ? " show" : "")}
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
        <li className="mc-account__appearance">
          <span>{t('nav.appearance')}</span>
          <ThemeSwitcher />
        </li>
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
    </div>
  );
}