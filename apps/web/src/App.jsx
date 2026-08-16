import { Routes, Route } from "react-router-dom";
import { Compass } from "lucide-react";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import MosqueProfile from "./pages/MosqueProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminSection from "./pages/SuperAdminSection";
import Support from "./pages/Support";
import SupportContinue from "./pages/SupportContinue";
import Community from "./pages/Community";
import AnnouncementDetails from "./pages/AnnouncementDetails";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/support" element={<Support />} />
        <Route path="/support/continue" element={<SupportContinue />} />
        <Route path="/community" element={<Community />} />
        <Route path="/community/announcements/:id" element={<AnnouncementDetails />} />
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
          path="/admin/mosque-claims"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdminSection
                title="Mosque Claim Approval"
                description="Review mosque admin claims, uploaded proof, and approval decisions."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/mosques"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdminSection
                title="Manage Mosques"
                description="View and manage registered mosques across the platform."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdminSection
                title="User Management"
                description="Manage user accounts, roles, and platform access."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/moderation"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdminSection
                title="Content Moderation"
                description="Moderate community posts, announcements, and reported content."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdminSection
                title="Reports & Complaints"
                description="Review complaints, safety reports, and platform issues."
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

function NotFound() {
  return (
    <div className="container py-5 text-center">
      <Compass size={42} className="text-mc" aria-hidden="true" />
      <h3 className="mt-3">Page not found</h3>
      <a href="/" className="btn btn-mc mt-2">Back home</a>
    </div>
  );
}
