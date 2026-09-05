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
const MosqueAdminAnnouncements = lazy(() => import("./pages/MosqueAdminAnnouncements"));
const MosqueAdminPrayerSchedule = lazy(() => import("./pages/MosqueAdminPrayerSchedule"));
const VerificationRequests = lazy(() => import("./pages/admin/VerificationRequests"));
const Support = lazy(() => import("./pages/Support"));
const SupportContinue = lazy(() => import("./pages/SupportContinue"));
const Community = lazy(() => import("./pages/Community"));
const BloodDonation = lazy(() => import("./pages/BloodDonation"));
const VolunteerOpportunities = lazy(() => import("./pages/VolunteerOpportunities"));
const AnnouncementDetails = lazy(() => import("./pages/AnnouncementDetails"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CampaignDetails = lazy(() => import("./pages/CampaignDetails"));

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
          <Route path="/support" element={<Support />} />
          <Route path="/support/continue" element={<SupportContinue />} />
          <Route path="/community" element={<Community />} />
          <Route path="/blood-donation" element={<BloodDonation />} />
          <Route path="/volunteers" element={<VolunteerOpportunities />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetails />} />
          <Route path="/community/announcements/:id" element={<AnnouncementDetails />} />
          <Route path="/community/events/:id" element={<EventDetails />} />
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
          <Route
            path="/mosque-admin/announcements"
            element={
              <ProtectedRoute allowedRoles={["mosque_admin"]} allowedStatuses={["approved"]}>
                <MosqueAdminAnnouncements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mosque-admin/prayer-schedule"
            element={
              <ProtectedRoute allowedRoles={["mosque_admin"]} allowedStatuses={["approved"]}>
                <MosqueAdminPrayerSchedule />
              </ProtectedRoute>
            }
          />
          <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
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
