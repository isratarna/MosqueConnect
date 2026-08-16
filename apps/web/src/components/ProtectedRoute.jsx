import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function getRoleHomePath(user) {
  if (!user) return "/login";

  if (user.role === "super_admin") {
    return "/admin";
  }

  if (user.role === "mosque_admin" && user.status === "approved") {
    return "/admin/dashboard";
  }

  return "/profile";
}

function AuthLoading() {
  return (
    <div className="container py-5 text-center" style={{ minHeight: "60vh" }}>
      <div className="spinner-border text-mc mb-3" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="text-muted small mb-0">Checking your session...</p>
    </div>
  );
}

export default function ProtectedRoute({ children, allowedRoles, allowedStatuses }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHomePath(user)} replace />;
  }

  if (allowedStatuses && !allowedStatuses.includes(user.status)) {
    return <Navigate to={getRoleHomePath(user)} replace />;
  }

  return children;
}
