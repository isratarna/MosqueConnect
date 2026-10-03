import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Clock3,
  ExternalLink,
  HandCoins,
  HeartHandshake,
  Inbox,
  PackageOpen,
  PackageSearch,
  LayoutDashboard,
  Megaphone,
  Menu,
  Moon,
  PencilLine,
  Sun,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../hooks/useLocale";
import { apiRequest } from "../utils/api";
import { DASHBOARD_SECTIONS, dashboardSection } from "../utils/dashboardFormat";
import DashboardOverview from "../components/admin/dashboard/DashboardOverview";
import InsightsPanel from "../components/admin/dashboard/InsightsPanel";
import AnnouncementManager from "../components/admin/AnnouncementManager";
import { DailyPrayersForm, JumuahForm } from "../components/admin/PrayerTimesSection";
import VolunteerManager from "../components/admin/VolunteerManager";
import { FacilitiesForm, ProfileForm } from "../components/admin/MosqueProfileEditor";
import CampaignManager from "../components/admin/CampaignManager";
import EventManager from "../components/admin/EventManager";
import EidJamaatManager from "../components/admin/EidJamaatManager";
import TeamManager from "../components/admin/TeamManager";
import { ComplaintsInbox, GoodsDonationManager, LostFoundManager } from "../components/admin/CommunityHubManagers";
import SuggestionReviewList from "../components/suggestions/SuggestionReviewList";
import { fetchMosqueSuggestions, reviewMosqueSuggestion } from "../utils/teamApi";
import { abilitiesOf, allowedSections, canUseSection, roleLabel } from "../utils/teamRoles";
import { BlockStack, SkeletonRegion } from "../components/skeletons";

const ICONS = {
  overview: LayoutDashboard,
  insights: BarChart3,
  announcements: Megaphone,
  prayer: Clock3,
  jummah: Sun,
  eid: Moon,
  events: CalendarDays,
  donations: HandCoins,
  volunteers: HeartHandshake,
  profile: Building2,
  facilities: Wrench,
  corrections: PencilLine,
  feedback: Inbox,
  goods: PackageOpen,
  lostfound: PackageSearch,
  team: UsersRound,
};

export default function AdminDashboard() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const managed = user?.managed_mosques || [];
  const membership = managed.find((item) => String(item.id) === params.get("mosque")) || managed[0];
  const mosqueId = membership?.id;
  // Only the sections the user's team role can use are shown or opened.
  const abilities = abilitiesOf(membership);
  const sections = allowedSections(DASHBOARD_SECTIONS, abilities);
  const requested = dashboardSection(params.get("section"));
  const section = canUseSection(abilities, requested) ? requested : "overview";

  const [mosque, setMosque] = useState(null);
  const [mosqueError, setMosqueError] = useState("");
  const [mosqueAttempt, setMosqueAttempt] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!mosqueId) return undefined;
    const controller = new AbortController();
    setMosque(null);
    setMosqueError("");
    apiRequest(`/api/admin/mosques/${mosqueId}`, { signal: controller.signal })
      .then((data) => setMosque(data.mosque))
      .catch((err) => { if (err.name !== "AbortError") setMosqueError(err.message); });
    return () => controller.abort();
  }, [mosqueId, mosqueAttempt]);

  const updateParams = useCallback((changes) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
      return next;
    }, { replace: true });
  }, [setParams]);

  const goTo = useCallback((id) => {
    updateParams({ section: id === "overview" ? null : id });
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [updateParams]);

  // Off-canvas menu on phones: Escape closes it, focus moves into it when it opens.
  useEffect(() => {
    if (!menuOpen) return undefined;
    menuRef.current?.querySelector("button")?.focus();
    const onKey = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    const opener = menuButtonRef.current;
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  if (!mosqueId) {
    return (
      <div className="container py-5" style={{ minHeight: "60vh" }}>
        <h1 className="h3">Mosque Dashboard</h1>
        {/* [Urmee · F6 Part 3] Switched from router state to ?tab= as the issue asked. */}
        <p>No mosque is assigned to this account. <Link to="/profile?tab=claims">View applications</Link>{user?.pending_mosque_invites_count > 0 && <> or <Link to="/profile?tab=invites">answer your team invitations</Link></>}.</p>
      </div>
    );
  }

  const name = mosque?.name || managed.find((item) => item.id === mosqueId)?.name || "Mosque Dashboard";
  const sectionLabel = DASHBOARD_SECTIONS.find((item) => item.id === section).label;

  const needsMosque = (render) => {
    if (mosqueError) return <div className="alert alert-danger" role="alert">{mosqueError} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => setMosqueAttempt((n) => n + 1)}>Retry</button></div>;
    if (!mosque) return <SkeletonRegion label="Loading…"><BlockStack heights={[40, 160]} /></SkeletonRegion>;
    return render(mosque);
  };

  const renderSection = () => {
    switch (section) {
      case "insights": return <InsightsPanel mosqueId={mosqueId} />;
      case "announcements": return <AnnouncementManager mosqueId={mosqueId} />;
      case "prayer": return <DailyPrayersForm mosqueId={mosqueId} />;
      case "jummah": return <JumuahForm mosqueId={mosqueId} />;
      case "eid": return needsMosque((m) => <EidJamaatManager mosqueId={mosqueId} mosque={m} />);
      case "events": return <EventManager mosqueId={mosqueId} />;
      case "donations": return <CampaignManager mosqueId={mosqueId} />;
      case "volunteers": return <VolunteerManager mosqueId={mosqueId} />;
      case "goods": return <GoodsDonationManager mosqueId={mosqueId} />;
      case "lostfound": return <LostFoundManager mosqueId={mosqueId} />;
      case "feedback": return <ComplaintsInbox mosqueId={mosqueId} />;
      case "profile": return needsMosque((m) => <ProfileForm mosque={m} onSaved={setMosque} />);
      case "facilities": return needsMosque((m) => <FacilitiesForm key={m.updated_at} mosque={m} onSaved={setMosque} />);
      case "corrections": return (
        <>
          <h2 className="h5 fw-bold mb-1"><PencilLine size={19} className="text-mc me-2" aria-hidden="true" />Suggested corrections</h2>
          <p className="text-muted small">Visitors' fixes to your prayer times and details. Accepting one updates your mosque straight away and, for time changes, tells your followers.</p>
          <SuggestionReviewList
            load={(query, options) => fetchMosqueSuggestions(mosqueId, query, options)}
            review={(suggestion, action, note) => reviewMosqueSuggestion(mosqueId, suggestion.id, action, note)}
            onReviewed={() => setMosqueAttempt((n) => n + 1)}
            emptyText="No corrections from visitors are waiting. Visitors can suggest one from your mosque's public page."
          />
        </>
      );
      case "team": return (
        <TeamManager
          mosqueId={mosqueId}
          mosqueName={name}
          onLeft={() => {
            // Leave the dashboard first, so its route guard doesn't redirect
            // home once the refreshed user is no longer a mosque admin.
            navigate("/profile", { replace: true });
            refreshUser();
          }}
        />
      );
      default: return <DashboardOverview mosqueId={mosqueId} mosqueName={name} abilities={abilities} onNavigate={goTo} />;
    }
  };

  return (
    <div className="container-xxl py-4 mc-dash" style={{ minHeight: "80vh" }}>
      <header className="d-flex flex-wrap align-items-center gap-2 mb-4">
        <button type="button" ref={menuButtonRef} className="btn btn-outline-secondary d-lg-none" aria-label="Open dashboard menu" aria-expanded={menuOpen} aria-controls="dashboard-menu" onClick={() => setMenuOpen(true)}>
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="me-auto min-w-0">
          <h1 className="h4 fw-bold mb-0 text-truncate">{name}</h1>
          <p className="small text-muted mb-0">Mosque dashboard · {sectionLabel}{membership?.role && <> · <span className="badge bg-light text-dark border">{roleLabel(membership.role)}</span></>}</p>
        </div>
        {managed.length > 1 && (
          <div>
            <label className="visually-hidden" htmlFor="admin-mosque">Managed mosque</label>
            <select id="admin-mosque" className="form-select form-select-sm" value={mosqueId} onChange={(e) => updateParams({ mosque: e.target.value })}>
              {managed.map((item) => <option value={item.id} key={item.id}>{item.name}{item.role ? ` (${roleLabel(item.role)})` : ""}</option>)}
            </select>
          </div>
        )}
        <Link to={`/mosque/${mosqueId}`} className="btn btn-sm btn-outline-mc"><ExternalLink size={15} aria-hidden="true" /> Public profile</Link>
      </header>

      <div className="mc-dash-layout">
        <div className="mc-dash-sidebar d-none d-lg-block">
          <SectionNav sections={sections} section={section} onSelect={goTo} />
        </div>

        {/* Phone menu. Rendered into <body> because the page shell has a transform,
            which would otherwise pin this fixed panel to the page instead of the screen. */}
        {menuOpen && createPortal(
          <>
            <div id="dashboard-menu" ref={menuRef} className="offcanvas offcanvas-start show mc-dash-offcanvas d-lg-none" role="dialog" aria-modal="true" aria-label="Dashboard sections" tabIndex={-1}>
              <div className="offcanvas-header justify-content-between border-bottom">
                <span className="h6 mb-0 fw-bold">Dashboard</span>
                <button type="button" className="btn btn-sm btn-light" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={18} aria-hidden="true" /></button>
              </div>
              <div className="offcanvas-body p-2">
                <SectionNav sections={sections} section={section} onSelect={goTo} />
              </div>
            </div>
            <div className="offcanvas-backdrop fade show d-lg-none" onClick={() => setMenuOpen(false)} />
          </>,
          document.body,
        )}

        <div className="mc-dash-main" key={`${section}-${mosqueId}`}>
          {section === "overview" ? renderSection() : <div className="card mc-dash-card"><div className="card-body p-3 p-md-4">{renderSection()}</div></div>}
        </div>
      </div>
    </div>
  );
}

function SectionNav({ sections, section, onSelect }) {
  return (
    <nav aria-label="Dashboard sections">
      <ul className="nav nav-pills flex-column gap-1 w-100">
        {sections.map(({ id, label }) => {
          const Icon = ICONS[id];
          return (
            <li className="nav-item" key={id}>
              <button type="button" className={`nav-link w-100 text-start d-flex align-items-center gap-2 ${section === id ? "active" : "text-body"}`} aria-current={section === id ? "page" : undefined} onClick={() => onSelect(id)}>
                <Icon size={17} aria-hidden="true" />{label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
