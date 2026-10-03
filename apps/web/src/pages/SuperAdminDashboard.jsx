import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  Building2,
  FileCheck2,
  Flag,
  LayoutDashboard,
  Megaphone,
  PencilLine,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  AuditPanel,
  BroadcastPanel,
  ClaimsPanel,
  CorrectionsPanel,
  ModerationPanel,
  MosquesPanel,
  OverviewPanel,
  ReportsPanel,
  SettingsPanel,
  StatisticsPanel,
  UsersPanel,
} from "../components/super-admin/AdminPanels";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../hooks/useLocale";

const SECTIONS = [
  { id: "overview", labelKey: "superAdmin.sections.overview", icon: LayoutDashboard },
  { id: "claims", labelKey: "superAdmin.sections.claims", icon: FileCheck2 },
  { id: "users", labelKey: "superAdmin.sections.users", icon: Users },
  { id: "mosques", labelKey: "superAdmin.sections.mosques", icon: Building2 },
  { id: "corrections", labelKey: "superAdmin.sections.corrections", icon: PencilLine },
  { id: "moderation", labelKey: "superAdmin.sections.moderation", icon: SlidersHorizontal },
  { id: "reports", labelKey: "superAdmin.sections.reports", icon: Flag },
  { id: "broadcasts", labelKey: "superAdmin.sections.broadcasts", icon: Megaphone },
  { id: "statistics", labelKey: "superAdmin.sections.statistics", icon: Activity },
  { id: "audit", labelKey: "superAdmin.sections.audit", icon: ScrollText },
  { id: "settings", labelKey: "superAdmin.sections.settings", icon: Settings },
];

export default function SuperAdminDashboard() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedSection = searchParams.get("section");
  const initialSection = SECTIONS.some(({ id }) => id === requestedSection) ? requestedSection : "overview";
  const [section, setSection] = useState(initialSection);

  useEffect(() => {
    if (requestedSection && SECTIONS.some(({ id }) => id === requestedSection)) setSection(requestedSection);
  }, [requestedSection]);

  const selectSection = (nextSection) => {
    setSection(nextSection);
    navigate(`/super-admin/dashboard?section=${nextSection}`, { replace: true });
  };

  const panel = useMemo(() => {
    switch (section) {
      case "claims": return <ClaimsPanel />;
      case "users": return <UsersPanel currentUser={user} />;
      case "mosques": return <MosquesPanel />;
      case "corrections": return <CorrectionsPanel />;
      case "moderation": return <ModerationPanel />;
      case "reports": return <ReportsPanel />;
      case "broadcasts": return <BroadcastPanel />;
      case "statistics": return <StatisticsPanel />;
      case "audit": return <AuditPanel />;
      case "settings": return <SettingsPanel />;
      default: return <OverviewPanel onNavigate={selectSection} />;
    }
  }, [section, user]);

  return (
    <div className="container-fluid py-4 mc-motion-section" style={{ minHeight: "85vh" }}>
      <div className="container-xxl">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 border-bottom pb-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <span className="rounded-circle bg-danger-subtle text-danger p-3"><ShieldCheck size={28} /></span>
            <div><h2 className="fw-bold mb-0">{t("superAdmin.title")}</h2><p className="text-muted mb-0 small">{t("superAdmin.signedInAs", { name: user?.name })}</p></div>
          </div>
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2">{t("profile.superAdmin")}</span>
        </div>

        <div className="row g-4">
          <aside className="col-xl-2 col-lg-3">
            <nav className="card border-0 shadow-sm p-2 sticky-lg-top" style={{ top: 92 }} aria-label={t("superAdmin.navLabel")}>
              <div className="nav nav-pills flex-row flex-lg-column gap-1">
                {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
                  <button
                    type="button"
                    key={id}
                    className={`nav-link text-start d-flex align-items-center gap-2 ${section === id ? "active" : "text-dark"}`}
                    onClick={() => selectSection(id)}
                  >
                    <Icon size={17} aria-hidden="true" />{t(labelKey)}
                  </button>
                ))}
              </div>
            </nav>
          </aside>
          <main className="col-xl-10 col-lg-9">{panel}</main>
        </div>
      </div>
    </div>
  );
}