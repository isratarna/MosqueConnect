import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function SuperAdminSection({ title, description }) {
  return (
    <div className="container py-5" style={{ minHeight: "70vh" }}>
      <Link to="/admin" className="btn btn-link text-decoration-none ps-0 mb-4 d-inline-flex align-items-center gap-2">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to System Admin
      </Link>

      <div className="card border-0 shadow-sm p-4 p-md-5">
        <div className="d-flex align-items-center gap-3 mb-3">
          <div className="mc-feature-icon">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>
          <h2 className="fw-bold mb-0">{title}</h2>
        </div>
        <p className="text-muted mb-0">{description}</p>
      </div>
    </div>
  );
}
