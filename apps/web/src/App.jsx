import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Compass } from "lucide-react";
import Layout from "./components/Layout";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import MosqueProfile from "./pages/MosqueProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import MosqueAdminAnnouncements from "./pages/MosqueAdminAnnouncements";
import VerificationRequests from "./pages/admin/VerificationRequests";
import Support from "./pages/Support";
import SupportContinue from "./pages/SupportContinue";
import Community from "./pages/Community";
import BloodDonation from "./pages/BloodDonation";
import VolunteerOpportunities from "./pages/VolunteerOpportunities";
import AnnouncementDetails from "./pages/AnnouncementDetails";
import EventDetails from "./pages/EventDetails";
import Notifications from "./pages/Notifications";
import Campaigns from "./pages/Campaigns";
import CampaignDetails from "./pages/CampaignDetails";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ children, allowedRoles, allowedStatuses }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="container py-5 text-center text-muted" role="status">Loading your account...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/support" element={<Support />} />
        <Route path="/support/continue" element={<SupportContinue />} />
        <Route path="/community" element={<Community />} />
        <Route path="/blood-donation" element={<BloodDonation />} />
        <Route path="/volunteers" element={<VolunteerOpportunities />} />
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
          path="/super-admin"
          element={

            <SuperAdminDashboard />

          }
        />
        <Route path="/admin/verification-requests" element={<VerificationRequests />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <RouteErrorBoundary key={location.key}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support/continue" element={<SupportContinue />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetails />} />
          <Route path="/community" element={<Community />} />
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
          <Route path="/admin/verification-requests" element={<VerificationRequests />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </RouteErrorBoundary>
    </Layout>
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
