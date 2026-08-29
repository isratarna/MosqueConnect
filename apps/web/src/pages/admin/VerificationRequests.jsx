import { Navigate } from "react-router-dom";

export default function VerificationRequests() {
  return <Navigate to="/super-admin/dashboard?section=claims" replace />;
}
