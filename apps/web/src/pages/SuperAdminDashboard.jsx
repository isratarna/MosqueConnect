import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  Building2,
  FileCheck2,
  Flag,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  AuditPanel,
  ClaimsPanel,
  ModerationPanel,
  MosquesPanel,
  OverviewPanel,
  ReportsPanel,
  SettingsPanel,
  StatisticsPanel,
  UsersPanel,
} from "../components/super-admin/AdminPanels";
import { useAuth } from "../context/AuthContext";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "claims", label: "Mosque Claims", icon: FileCheck2 },
  { id: "users", label: "Users", icon: Users },
  { id: "mosques", label: "Mosques", icon: Building2 },
  { id: "moderation", label: "Moderation", icon: SlidersHorizontal },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "statistics", label: "Statistics", icon: Activity },
  { id: "audit", label: "Audit Log", icon: ScrollText },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function SuperAdminDashboard() {
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
      case "moderation": return <ModerationPanel />;
      case "reports": return <ReportsPanel />;
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
            <div><h2 className="fw-bold mb-0">System Administration</h2><p className="text-muted mb-0 small">Signed in as {user?.name} · Full platform oversight</p></div>
          </div>
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2">Super Admin</span>
        </div>

        <div className="row g-4">
          <aside className="col-xl-2 col-lg-3">
            <nav className="card border-0 shadow-sm p-2 sticky-lg-top" style={{ top: 92 }} aria-label="Super admin sections">
              <div className="nav nav-pills flex-row flex-lg-column gap-1">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    type="button"
                    key={id}
                    className={`nav-link text-start d-flex align-items-center gap-2 ${section === id ? "active" : "text-dark"}`}
                    onClick={() => selectSection(id)}
                  >
                    <Icon size={17} aria-hidden="true" />{label}
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
