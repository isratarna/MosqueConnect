import { Routes, Route, Navigate } from "react-router-dom";
import { Compass } from "lucide-react";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import MosqueProfile from "./pages/MosqueProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Support from "./pages/Support";
import SupportContinue from "./pages/SupportContinue";
import Community from "./pages/Community";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ children, allowedRoles, allowedStatuses }) {
  const { user } = useAuth();

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
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/support" element={<Support />} />
        <Route path="/support/continue" element={<SupportContinue />} />
        <Route path="/community" element={<Community />} />
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
