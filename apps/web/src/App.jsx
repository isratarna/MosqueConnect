import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Compass } from "lucide-react";
import Layout from "./components/Layout";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import { useAuth } from "./context/AuthContext";

const Home = lazy(() => import("./pages/Home"));
const Browse = lazy(() => import("./pages/Browse"));
const MosqueProfile = lazy(() => import("./pages/MosqueProfile"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const MosqueAdminClaim = lazy(() => import("./pages/MosqueAdminClaim"));
const VerificationRequests = lazy(() => import("./pages/admin/VerificationRequests"));
const Support = lazy(() => import("./pages/Support"));
const SupportContinue = lazy(() => import("./pages/SupportContinue"));
const Community = lazy(() => import("./pages/Community"));
const BloodDonation = lazy(() => import("./pages/BloodDonation"));
const VolunteerOpportunities = lazy(() => import("./pages/VolunteerOpportunities"));
const AnnouncementDetails = lazy(() => import("./pages/AnnouncementDetails"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const LostFoundDetails = lazy(() => import("./pages/LostFoundDetails"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CampaignDetails = lazy(() => import("./pages/CampaignDetails"));
const Eid = lazy(() => import("./pages/Eid"));
const Search = lazy(() => import("./pages/Search"));
const Journey = lazy(() => import("./pages/Journey"));

function ProtectedRoute({ children, allowedRoles, allowedStatuses }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-mc" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (allowedStatuses && !allowedStatuses.includes(user.status)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();

  return (
    <Layout>
      <RouteErrorBoundary key={location.key}>
        <Suspense fallback={<PageLoading />}>
          <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/search" element={<Search />} />
          <Route path="/eid" element={<Eid />} />
          <Route path="/journey" element={<Journey />} />
          <Route path="/journey/:id" element={<Journey />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support/continue" element={<SupportContinue />} />
          <Route path="/community" element={<Community />} />
          <Route path="/blood-donation" element={<BloodDonation />} />
          <Route path="/volunteers" element={<VolunteerOpportunities />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetails />} />
          <Route path="/community/announcements/:id" element={<AnnouncementDetails />} />
          <Route path="/community/events/:id" element={<EventDetails />} />
          <Route path="/community/lost-found/:id" element={<LostFoundDetails />} />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route path="/mosque/:id" element={<MosqueProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["mosque_admin"]} allowedStatuses={["approved"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/mosque-admin/announcements" element={<DashboardSectionRedirect section="announcements" />} />
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/mosque-admin/prayer-schedule" element={<DashboardSectionRedirect section="prayer" />} />
          <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route
            path="/mosque-admin/claim"
            element={
              <ProtectedRoute>
                <MosqueAdminClaim />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/verification-requests"
            element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <VerificationRequests />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
    </Layout>
  );
}

/** Old admin pages now live in the dashboard; keep their links working. */
function DashboardSectionRedirect({ section }) {
  const { search } = useLocation();
  const mosque = new URLSearchParams(search).get("mosque");
  const params = new URLSearchParams({ section, ...(mosque ? { mosque } : {}) });
  return <Navigate to={`/admin/dashboard?${params}`} replace />;
}

function PageLoading() {
  return (
    <div className="d-flex justify-content-center align-items-center py-5" role="status">
      <div className="spinner-border text-mc" aria-hidden="true" />
      <span className="visually-hidden">Loading page...</span>
    </div>
  );
}

function NotFound() {
  return (
    <div className="container py-5 text-center">
      <Compass size={42} className="text-mc" aria-hidden="true" />
      <h3 className="mt-3">Page not found</h3>
      <Link to="/" className="btn btn-mc mt-2">Back home</Link>
    </div>
  );
}
