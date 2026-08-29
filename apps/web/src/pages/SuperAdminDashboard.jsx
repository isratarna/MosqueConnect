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
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Activity,
  Building2,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw,
  Settings,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock Data
      setStats({
        totalMosques: 1240,
        verifiedMosques: 895,
        pendingVerificationRequests: 14,
        totalRegisteredUsers: 14205,
        pendingModerationItems: 3
      });

      setPendingVerifications([
        { id: "vr-101", name: "Baitul Mukarram National Mosque", requestDate: "2026-08-25", status: "pending", requestedBy: "admin@baitul.com" },
        { id: "vr-102", name: "Gulshan Society Mosque", requestDate: "2026-08-24", status: "pending", requestedBy: "contact@gulshansociety.org" },
        { id: "vr-103", name: "Sobhanbag Jame Masjid", requestDate: "2026-08-23", status: "pending", requestedBy: "imam@sobhanbag.org" }
      ]);

      setRecentActivity([
        { id: "act-1", action: "Approved mosque verification", target: "Mirpur Central Mosque", time: "2 hours ago", admin: "SuperAdmin User" },
        { id: "act-2", action: "Rejected claim request", target: "Banani Jame Mosque", time: "5 hours ago", admin: "SuperAdmin User" },
        { id: "act-3", action: "Suspended user account", target: "user_fake_spammer", time: "1 day ago", admin: "SuperAdmin User" },
      ]);
    } catch (err) {
      setError("Failed to fetch super admin dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === "SUPER_ADMIN" || user.role === "superadmin")) {
      fetchData();
    }
  }, [user]);

  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "superadmin")) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: "60vh" }}>
        <div className="alert alert-danger max-w-md mx-auto p-4 shadow">
          <ShieldAlert size={48} className="text-danger mb-3 mx-auto" />
          <h4 className="fw-bold mb-2">Access Denied</h4>
          <p className="mb-3">This area is strictly restricted to Platform Super Administrators.</p>
          <button className="btn btn-mc" onClick={() => navigate("/")}>Return to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 mc-motion-section" style={{ minHeight: "85vh", maxWidth: "1400px", margin: "0 auto" }}>
      <div className="row g-4 mb-4 border-bottom pb-3">
        <div className="col-12 d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <Shield size={28} className="text-mc" />
              <h2 className="fw-bold mb-0">Super Admin Dashboard</h2>
            </div>
            <p className="text-muted small mb-0 mt-1">Platform overview, mosque verifications, and moderation tools.</p>
          </div>
          <button className="btn btn-outline-mc btn-sm d-flex align-items-center gap-2" onClick={fetchData} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Refresh Data
          </button>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="alert alert-warning text-center py-5 shadow-sm">
          <AlertCircle size={32} className="text-warning mb-3 mx-auto" />
          <h5 className="fw-bold">Data Fetch Error</h5>
          <p>{error}</p>
          <button className="btn btn-warning mt-2" onClick={fetchData}>Try Again</button>
        </div>
      ) : (
        <div className="row g-4">
          {/* STATS ROW */}
          <div className="col-12">
            <div className="row g-3">
              <StatCard title="Total Mosques" value={stats.totalMosques.toLocaleString()} icon={Building2} />
              <StatCard title="Verified Mosques" value={stats.verifiedMosques.toLocaleString()} icon={CheckCircle} colorClass="text-success" />
              <StatCard title="Pending Verification" value={stats.pendingVerificationRequests} icon={Clock} colorClass={stats.pendingVerificationRequests > 0 ? "text-warning" : "text-muted"} />
              <StatCard title="Total Users" value={stats.totalRegisteredUsers.toLocaleString()} icon={Users} />
              <StatCard title="Moderation Queue" value={stats.pendingModerationItems} icon={AlertCircle} colorClass={stats.pendingModerationItems > 0 ? "text-danger" : "text-muted"} />
            </div>
          </div>

          <div className="col-lg-8 col-xl-9">
            {/* PENDING VERIFICATIONS */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <FileText size={20} className="text-mc" />
                  Pending Verifications
                </h5>
                <Link to="/admin/verification-requests" className="btn btn-sm btn-link text-decoration-none">View All</Link>
              </div>
              <div className="card-body p-0">
                {pendingVerifications.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <CheckCircle size={40} className="mb-2 opacity-50 mx-auto" />
                    <p className="mb-0">All clear! No pending verification requests.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-4">Request ID</th>
                          <th>Mosque Name</th>
                          <th>Requested By</th>
                          <th>Date</th>
                          <th className="pe-4 text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingVerifications.map((req) => (
                          <tr key={req.id}>
                            <td className="ps-4 text-muted small">{req.id}</td>
                            <td className="fw-semibold">{req.name}</td>
                            <td><a href={`mailto:${req.requestedBy}`} className="text-decoration-none small text-secondary">{req.requestedBy}</a></td>
                            <td className="small">{req.requestDate}</td>
                            <td className="pe-4 text-end">
                              <Link to={`/admin/verification-requests?id=${req.id}`} className="btn btn-sm btn-mc">Review</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <Activity size={20} className="text-mc" />
                  Recent Administrative Activity
                </h5>
              </div>
              <div className="card-body p-0">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <Activity size={40} className="mb-2 opacity-50 mx-auto" />
                    <p className="mb-0">No recent activity found.</p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {recentActivity.map((log) => (
                      <div key={log.id} className="list-group-item px-4 py-3 border-bottom border-light">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <strong className="text-dark">{log.action}</strong>
                          <span className="badge bg-light text-secondary border">{log.time}</span>
                        </div>
                        <p className="mb-0 small text-muted">Target: <span className="fw-medium text-dark">{log.target}</span> • By {log.admin}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4 col-xl-3">
            {/* QUICK NAVIGATION */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom py-3">
                <h6 className="fw-bold mb-0 text-uppercase text-muted" style={{ fontSize: "0.8rem", letterSpacing: "1px" }}>Quick Shortcuts</h6>
              </div>
              <div className="card-body p-3">
                <div className="d-grid gap-2">
                  <Link to="/admin/verification-requests" className="btn btn-light border text-start d-flex align-items-center gap-3 py-2">
                    <FileText size={18} className="text-mc" />
                    <span className="fw-medium small">Verification Queue</span>
                  </Link>
                  <button className="btn btn-light border text-start d-flex align-items-center gap-3 py-2">
                    <Building2 size={18} className="text-mc" />
                    <span className="fw-medium small">Mosque Management</span>
                  </button>
                  <button className="btn btn-light border text-start d-flex align-items-center gap-3 py-2">
                    <ShieldAlert size={18} className="text-mc" />
                    <span className="fw-medium small">Moderation Tools</span>
                  </button>
                  <button className="btn btn-light border text-start d-flex align-items-center gap-3 py-2">
                    <Settings size={18} className="text-secondary" />
                    <span className="fw-medium small">Platform Settings</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="alert alert-info border-info-subtle bg-info-subtle text-info-emphasis small shadow-sm p-3 rounded">
              <strong>Beta Notice:</strong> The super admin moderation APIs are currently in development by Member 3. Actions on this page are temporarily simulated.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, colorClass = "text-mc" }) {
  return (
    <div className="col-sm-6 col-md-4 col-xl">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h6 className="text-muted small text-uppercase mb-0">{title}</h6>
            <div className={`p-2 rounded bg-light ${colorClass}`}>
              <Icon size={20} />
            </div>
          </div>
          <h2 className={`fw-bold mb-0 ${colorClass}`}>{value}</h2>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="row g-4 placeholder-glow">
      <div className="col-12">
        <div className="row g-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="col-sm-6 col-md-4 col-xl">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4 pb-5">
                  <div className="placeholder col-6 bg-secondary mb-3 rounded"></div>
                  <div className="placeholder col-8 bg-secondary placeholder-lg rounded d-block"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="col-lg-8 col-xl-9">
        <div className="card border-0 shadow-sm mb-4" style={{ height: "300px" }}>
          <div className="card-header bg-white border-bottom py-3"><span className="placeholder col-3 bg-secondary rounded"></span></div>
          <div className="card-body p-4">
            <div className="placeholder col-12 bg-light mb-2 rounded p-2"></div>
            <div className="placeholder col-12 bg-light mb-2 rounded p-2"></div>
            <div className="placeholder col-12 bg-light mb-2 rounded p-2"></div>
          </div>
        </div>
      </div>
      <div className="col-lg-4 col-xl-3">
        <div className="card border-0 shadow-sm" style={{ height: "250px" }}>
          <div className="card-header bg-white border-bottom py-3"><span className="placeholder col-5 bg-secondary rounded"></span></div>
          <div className="card-body p-3 d-grid gap-2">
            <div className="placeholder col-12 bg-light p-3 rounded border"></div>
            <div className="placeholder col-12 bg-light p-3 rounded border"></div>
            <div className="placeholder col-12 bg-light p-3 rounded border"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
