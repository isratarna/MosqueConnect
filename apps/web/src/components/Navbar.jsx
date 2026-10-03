import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ChevronDown, Heart, Landmark, LogOut, Menu, Search, ShieldCheck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import GlobalSearch from "./GlobalSearch";
import LanguageSwitcher from "./LanguageSwitcher";
import NotificationList from "./notifications/NotificationList";
import ThemeSwitcher from "./ThemeSwitcher";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { fetchNotifications } from "../utils/notificationApi";
import { getNotificationPath, isNotificationRead } from "../utils/notificationUtils";
import { statusLabel } from "../utils/labels";
import logo from "../assets/Logo.png";

const NAVBAR_NOTIFICATION_LIMIT = 6;

export default function Navbar() {
  // [Urmee · i18n restore] Every label in the navbar now goes through t(), so it switches with the
  // language toggle.
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // mobile collapse
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // "/" focuses the navbar search only (searchRef is its instance, never the hero's), unless the user is already typing somewhere.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (typing) return;
      event.preventDefault(); // keep the "/" out of the box
      setSearchOpen(true);
      searchRef.current?.focus(); // already open: focus it; otherwise autoFocus does it on mount
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

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
  // [Urmee · F5 Part 5] One open dropdown at a time (shared with the notification and profile menus).
  const toggleDropdown = (id) => setActiveDropdown((current) => (current === id ? null : id));

  return (
    <nav className={`navbar navbar-expand-lg navbar-dark mc-navbar sticky-top${isScrolled ? " is-scrolled" : ""}`}>
      <div className="container px-3 px-lg-0">
        <Link className="navbar-brand mc-brand me-2 me-lg-0" to="/" onClick={close}>
          <img src={logo} alt="MosqueConnect logo" className="mc-brand-logo me-2" />
          <span className="mc-brand-title">
            Mosque<span className="mc-brand-accent">Connect</span>
          </span>
        </Link>
        <button
          type="button"
          className={"mc-nav-search-toggle ms-auto ms-lg-2 order-lg-last" + (searchOpen ? " is-active" : "")}
          aria-label={t("nav.search")}
          aria-expanded={searchOpen}
          aria-keyshortcuts="/"
          title={t("nav.searchHint")}
          onClick={() => setSearchOpen((value) => !value)}
        >
          <Search size={18} aria-hidden="true" />
        </button>

        <button
          className="navbar-toggler ms-2 ms-lg-0"
          type="button"
          aria-label={t("common.toggleNavigation")}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className={"collapse navbar-collapse mt-1 mt-lg-0" + (open ? " show" : "")}>
          <ul className="navbar-nav ms-auto align-items-start align-items-lg-center gap-1 gap-lg-1 py-1 py-lg-0">
            <NavDropdown
              label={t("nav.prayerTimes")}
              id="prayer"
              isOpen={activeDropdown === "prayer"}
              onToggle={toggleDropdown}
              onClose={closeDropdowns}
              onNavigate={() => { close(); closeDropdowns(); }}
              items={[
                { to: "/", label: t("nav.jamatNearMe"), hash: "map" },
                { to: "/journey", label: t("nav.journeyPlanner") },
                { to: "/eid", label: t("nav.eidJamaats") },
                { to: "/qibla", label: t("nav.qibla") },
              ]}
            />
            <li className="nav-item">
              <NavLink className={navLinkClass} to="/browse" onClick={close}>{t("nav.mosques")}</NavLink>
            </li>
            <NavDropdown
              label={t("nav.community")}
              id="community"
              isOpen={activeDropdown === "community"}
              onToggle={toggleDropdown}
              onClose={closeDropdowns}
              onNavigate={() => { close(); closeDropdowns(); }}
              items={[
                { to: "/community", label: t("footer.communityHub") },
                { to: "/community?category=announcement", label: t("footer.announcements") },
                { to: "/community?category=event", label: t("footer.events") },
                { to: "/blood-donation", label: t("nav.bloodDonation") },
                { to: "/volunteers", label: t("nav.volunteers") },
                { to: "/community?category=lost_found", label: t("footer.lostFound") },
              ]}
            />
            <NavDropdown
              label={t("nav.donate")}
              id="donate"
              isOpen={activeDropdown === "donate"}
              onToggle={toggleDropdown}
              onClose={closeDropdowns}
              onNavigate={() => { close(); closeDropdowns(); }}
              items={[
                { to: "/support", label: t("nav.supportMosque") },
                { to: "/campaigns", label: t("nav.campaignsPlural") },
              ]}
            />

            <li className="nav-item mc-navbar__appearance d-flex align-items-center gap-2 mt-1 mt-lg-0">
              {/* [Urmee · i18n restore] Language switcher (EN | বাং) sits right beside the theme switcher; on small screens both live inside the collapsed menu. */}
              <LanguageSwitcher />
              <ThemeSwitcher />
            </li>

            {!user ? (
              <>
                <li className="nav-item ms-lg-2 mt-1 mt-lg-0">
                  <Link className="btn btn-outline-mc btn-sm w-100 w-lg-auto" to="/login" onClick={close}>{t("nav.login")}</Link>
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
      {searchOpen && (
        <div className="mc-nav-search-row">
          <div className="container px-3 px-lg-0">
            <GlobalSearch ref={searchRef} id="navbar-search" variant="nav" autoFocus onDismiss={closeSearch} />
          </div>
        </div>
      )}
      <span className="mc-navbar__progress" aria-hidden="true" />
    </nav>
  );
}

/** A top-level nav item with a small menu; closes on Escape (handled by Navbar), outside click and navigation. */
// [Urmee · F5 Part 5] Top-level item with a small menu (Prayer Times, Community, Donate); closes on
// outside click, Escape (handled by Navbar) and navigation.
function NavDropdown({ label, id, items, isOpen, onToggle, onClose, onNavigate }) {
  const ref = useRef(null);
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event) => { if (!ref.current?.contains(event.target)) onClose(); };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen, onClose]);

  const isCurrent = (item) => {
    const [path, query = ""] = item.to.split("?");
    return pathname === path && (query ? search.includes(query) : !search);
  };
  const active = items.some((item) => pathname === item.to.split("?")[0] && !item.hash);

  return (
    <li className="nav-item dropdown" ref={ref}>
      <button
        type="button"
        className={"nav-link btn btn-link d-inline-flex align-items-center gap-1" + (active ? " active" : "")}
        aria-expanded={isOpen}
        aria-controls={`nav-menu-${id}`}
        onClick={() => onToggle(id)}
      >
        {label} <ChevronDown size={14} aria-hidden="true" />
      </button>
      <ul id={`nav-menu-${id}`} className={"dropdown-menu mc-nav-menu" + (isOpen ? " show" : "")}>
        {items.map((item) => (
          <li key={item.to + (item.hash || "")}>
            <Link
              className={"dropdown-item" + (isCurrent(item) ? " active" : "")}
              to={item.hash ? { pathname: item.to, hash: `#${item.hash}` } : item.to}
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </li>
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
    refreshUnreadCount,
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
    // Opening the bell is a good moment to re-sync the badge with the server.
    // [Urmee · F1 Part 4] Opening the bell re-syncs the unread badge with the server.
    refreshUnreadCount({ signal: controller.signal, silent: true }).catch(() => {});
    return () => controller.abort();
  }, [isOpen, loadNotifications, refreshUnreadCount, reloadKey]);

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
              {t('nav.admin')}
            </span>
          )}
          {isAdminPending && (
            <span className="badge bg-warning-subtle text-warning border border-warning-subtle text-dark ms-1" style={{ fontSize: "10px" }}>
              {statusLabel(t, 'pending')}
            </span>
          )}
          {isSuperAdmin && (
            <span className="badge bg-danger-subtle text-danger border border-danger-subtle ms-1" style={{ fontSize: "10px" }}>
              {t('profile.superAdminBadge')}
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
