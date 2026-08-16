import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MODULES = [
  {
    title: "Mosque Claims",
    description: "Review and approve mosque admin registration requests.",
    to: "/admin/mosque-claims",
    icon: Building2,
  },
  {
    title: "Manage Mosques",
    description: "View and manage registered mosques across the platform.",
    to: "/admin/mosques",
    icon: Building2,
  },
  {
    title: "User Management",
    description: "Manage user accounts, roles, and access.",
    to: "/admin/users",
    icon: Users,
  },
  {
    title: "Content Moderation",
    description: "Review reported community posts and announcements.",
    to: "/admin/moderation",
    icon: AlertTriangle,
  },
  {
    title: "Reports",
    description: "Review complaints and platform reports.",
    to: "/admin/reports",
    icon: AlertTriangle,
  },
];

export default function SuperAdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="container py-5" style={{ minHeight: "80vh" }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="mc-feature-icon">
          <ShieldCheck size={24} aria-hidden="true" />
        </div>
        <div>
          <h2 className="fw-bold mb-1">System Administration</h2>
          <p className="text-muted mb-0">
            Welcome, {user?.name || "Super Admin"}. Manage platform-wide settings and moderation.
          </p>
        </div>
      </div>

      <div className="row g-4 mc-motion-stagger">
        {MODULES.map(({ title, description, to, icon: Icon }) => (
          <div className="col-md-6 col-lg-4" key={to}>
            <Link to={to} className="card h-100 shadow-sm border-0 text-decoration-none text-body mc-motion-section">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-3 text-mc">
                  <Icon size={20} aria-hidden="true" />
                  <LayoutDashboard size={18} aria-hidden="true" />
                </div>
                <h5 className="fw-bold mb-2">{title}</h5>
                <p className="text-muted small mb-0">{description}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
