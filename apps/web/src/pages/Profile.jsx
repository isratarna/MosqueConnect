import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Heart,
  Mail,
  MapPin,
  Phone,
  Settings,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MOSQUES } from "../data/mosques";
import MosqueCard from "../components/MosqueCard";

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("followed");

  if (!user) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-mc mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted">Please log in to view your profile.</p>
        <Link to="/login" className="btn btn-mc">Log In</Link>
      </div>
    );
  }

  // Get a couple of default mosques to show as mock followed/saved mosques
  const followedMosques = MOSQUES.slice(0, 2);
  const savedMosques = MOSQUES.slice(2, 4);

  // Status handler for simulation
  const handleSimulateStatus = (newStatus) => {
    updateUser({ status: newStatus });
  };

  return (
    <div className="container py-5" style={{ minHeight: "80vh" }}>
      <div className="row g-4 mc-motion-stagger">
        {/* SIDE BAR / USER SUMMARY */}
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 p-4 text-center mb-4">
            <div
              className="rounded-circle bg-mc text-white d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{ width: "90px", height: "90px", fontSize: "36px", fontWeight: "600" }}
            >
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.name.charAt(0).toUpperCase()}
            </div>
            <h4 className="fw-bold mb-1">{user.fullName || user.name}</h4>
            <p className="text-muted small mb-3">{user.email}</p>

            <span
              className={`badge py-2 px-3 rounded-pill mb-4 mx-auto ${
                user.role === "super_admin"
                  ? "bg-danger-subtle text-danger border border-danger-subtle"
                  : user.role === "mosque_admin"
                  ? "bg-primary-subtle text-primary border border-primary-subtle"
                  : "bg-success-subtle text-success border border-success-subtle"
              }`}
              style={{ width: "fit-content" }}
            >
              {user.role === "super_admin"
                ? "Super Admin"
                : user.role === "mosque_admin"
                ? "Mosque Admin"
                : "Regular User"}
            </span>

            <div className="text-start border-top pt-3 small">
              <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                <Mail size={16} />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                  <Phone size={16} />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.role === "mosque_admin" && (
                <>
                  <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                    <Building2 size={16} />
                    <span>{user.mosqueName}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 mb-2 text-muted">
                    <MapPin size={16} />
                    <span>{user.mosqueAddress}</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="btn btn-outline-danger btn-sm w-100 mt-4"
            >
              Log Out
            </button>
          </div>

          {/* DEV STATUS SIMULATOR */}
          {user.role === "mosque_admin" && (
            <div className="card shadow-sm border border-warning p-4">
              <h5 className="fw-bold text-warning mb-3 d-flex align-items-center gap-2">
                <ShieldCheck size={20} />
                Dev Status Simulator
              </h5>
              <p className="text-muted small mb-3">
                Simulate Super Admin approval or rejection for this Mosque Admin registration.
              </p>
              <div className="d-flex flex-column gap-2">
                <button
                  onClick={() => handleSimulateStatus("approved")}
                  className={`btn btn-sm d-flex align-items-center justify-content-center gap-2 ${
                    user.status === "approved" ? "btn-success" : "btn-outline-success"
                  }`}
                >
                  <CheckCircle2 size={15} />
                  Simulate Approve
                </button>
                <button
                  onClick={() => handleSimulateStatus("pending")}
                  className={`btn btn-sm d-flex align-items-center justify-content-center gap-2 ${
                    user.status === "pending" ? "btn-warning text-dark" : "btn-outline-warning text-dark"
                  }`}
                >
                  <AlertTriangle size={15} />
                  Simulate Pending
                </button>
                <button
                  onClick={() => handleSimulateStatus("rejected")}
                  className={`btn btn-sm d-flex align-items-center justify-content-center gap-2 ${
                    user.status === "rejected" ? "btn-danger" : "btn-outline-danger"
                  }`}
                >
                  <XCircle size={15} />
                  Simulate Reject
                </button>
              </div>
              <div className="mt-3 text-center">
                <span className="small text-muted">
                  Current Status:{" "}
                  <span
                    className={`fw-semibold text-uppercase ${
                      user.status === "approved"
                        ? "text-success"
                        : user.status === "rejected"
                        ? "text-danger"
                        : "text-warning"
                    }`}
                  >
                    {user.status}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* MAIN PANEL */}
        <div className="col-lg-8">
          {/* PENDING / REJECTED STATUS BANNERS */}
          {user.role === "mosque_admin" && user.status === "pending" && (
            <div className="alert alert-warning border border-warning shadow-sm p-4 mb-4 d-flex gap-3 align-items-start">
              <AlertTriangle className="text-warning flex-shrink-0 mt-1" size={28} />
              <div>
                <h5 className="alert-heading fw-bold mb-1">Verification Pending</h5>
                <p className="mb-2">
                  Your Mosque Admin application for <strong>{user.mosqueName}</strong> is pending Super Admin approval.
                </p>
                <p className="mb-0 text-muted small">
                  The verification process typically takes 1-2 business days. In the meantime, you have full access to all standard community features.
                </p>
              </div>
            </div>
          )}

          {user.role === "mosque_admin" && user.status === "rejected" && (
            <div className="alert alert-danger border border-danger shadow-sm p-4 mb-4 d-flex gap-3 align-items-start">
              <XCircle className="text-danger flex-shrink-0 mt-1" size={28} />
              <div>
                <h5 className="alert-heading fw-bold mb-1">Application Rejected</h5>
                <p className="mb-2">
                  Unfortunately, your Mosque Admin application for <strong>{user.mosqueName}</strong> has been rejected by the Super Admin.
                </p>
                <p className="mb-0 text-muted small">
                  Please contact support or double check your uploaded credentials to resolve any validation discrepancies.
                </p>
              </div>
            </div>
          )}

          {user.role === "mosque_admin" && user.status === "approved" && (
            <div className="card border border-success bg-success-subtle shadow-sm p-4 mb-4">
              <div className="d-flex gap-3 align-items-start">
                <CheckCircle2 className="text-success flex-shrink-0 mt-1" size={28} />
                <div className="w-100">
                  <h5 className="fw-bold text-success mb-1">Verified Mosque Admin</h5>
                  <p className="mb-3 text-dark">
                    Your application for <strong>{user.mosqueName}</strong> is fully approved. You can now manage mosque timings, announcements, and donation campaigns.
                  </p>
                  <Link to="/admin/dashboard" className="btn btn-success d-inline-flex align-items-center gap-2 fw-semibold shadow-sm">
                    <Building2 size={16} />
                    Go to Mosque Admin Dashboard
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB LINKS */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pt-3">
              <ul className="nav nav-tabs card-header-tabs border-bottom-0">
                <li className="nav-item">
                  <button
                    className={`nav-link border-0 fw-semibold px-4 py-3 d-flex align-items-center gap-2 ${
                      activeTab === "followed" ? "active text-mc border-bottom border-mc" : "text-secondary"
                    }`}
                    style={{ background: "transparent" }}
                    onClick={() => setActiveTab("followed")}
                  >
                    <Heart size={16} />
                    Followed Mosques
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link border-0 fw-semibold px-4 py-3 d-flex align-items-center gap-2 ${
                      activeTab === "saved" ? "active text-mc border-bottom border-mc" : "text-secondary"
                    }`}
                    style={{ background: "transparent" }}
                    onClick={() => setActiveTab("saved")}
                  >
                    <Heart size={16} fill="currentColor" />
                    Saved Mosques
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link border-0 fw-semibold px-4 py-3 d-flex align-items-center gap-2 ${
                      activeTab === "activity" ? "active text-mc border-bottom border-mc" : "text-secondary"
                    }`}
                    style={{ background: "transparent" }}
                    onClick={() => setActiveTab("activity")}
                  >
                    <Calendar size={16} />
                    Community Activity
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link border-0 fw-semibold px-4 py-3 d-flex align-items-center gap-2 ${
                      activeTab === "donations" ? "active text-mc border-bottom border-mc" : "text-secondary"
                    }`}
                    style={{ background: "transparent" }}
                    onClick={() => setActiveTab("donations")}
                  >
                    <CreditCard size={16} />
                    Donations
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link border-0 fw-semibold px-4 py-3 d-flex align-items-center gap-2 ${
                      activeTab === "settings" ? "active text-mc border-bottom border-mc" : "text-secondary"
                    }`}
                    style={{ background: "transparent" }}
                    onClick={() => setActiveTab("settings")}
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                </li>
              </ul>
            </div>

            <div className="card-body p-4 border-top mc-tab-panel" key={activeTab}>
              {/* FOLLOWED MOSQUES */}
              {activeTab === "followed" && (
                <div>
                  <h5 className="fw-bold mb-3">Mosques you follow</h5>
                  <p className="text-muted small mb-4">You will receive regular announcements and prayer time updates from these mosques.</p>
                  <div className="row g-4">
                    {followedMosques.map((m) => (
                      <div className="col-md-6" key={m.id}>
                        <MosqueCard mosque={m} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SAVED MOSQUES */}
              {activeTab === "saved" && (
                <div>
                  <h5 className="fw-bold mb-3">Bookmarked Mosques</h5>
                  <p className="text-muted small mb-4">Quick access to prayer profiles you frequently visit.</p>
                  <div className="row g-4">
                    {savedMosques.map((m) => (
                      <div className="col-md-6" key={m.id}>
                        <MosqueCard mosque={m} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COMMUNITY ACTIVITY */}
              {activeTab === "activity" && (
                <div>
                  <h5 className="fw-bold mb-4">Your Recent Activity</h5>
                  <div className="timeline py-2">
                    <div className="d-flex gap-3 mb-4">
                      <div className="bg-success-subtle text-success p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: "40px", height: "40px" }}>
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-1">Joined Eid Congregation Planning</h6>
                        <p className="text-muted small mb-0">Participated as a volunteer. 2 days ago</p>
                      </div>
                    </div>
                    <div className="d-flex gap-3 mb-4">
                      <div className="bg-primary-subtle text-primary p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: "40px", height: "40px" }}>
                        <Building2 size={18} />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-1">Followed Baitul Mukarram National Mosque</h6>
                        <p className="text-muted small mb-0">Started receiving notifications. 5 days ago</p>
                      </div>
                    </div>
                    <div className="d-flex gap-3">
                      <div className="bg-secondary-subtle text-secondary p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: "40px", height: "40px" }}>
                        <User size={18} />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-1">Account Created</h6>
                        <p className="text-muted small mb-0">Successfully registered on MosqueConnect. 1 week ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DONATION ACTIVITY */}
              {activeTab === "donations" && (
                <div>
                  <h5 className="fw-bold mb-3">Donation History</h5>
                  <p className="text-muted small mb-4">Review your online donations facilitated through MosqueConnect.</p>
                  <div className="table-responsive">
                    <table className="table table-hover border align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Mosque</th>
                          <th>Campaign</th>
                          <th>Amount</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="fw-bold">Baitul Mukarram National Mosque</td>
                          <td>Roof Renovation Fund</td>
                          <td className="fw-bold">৳5,000</td>
                          <td>2026-07-12</td>
                          <td><span className="badge bg-success">Success</span></td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Gulshan Central Mosque</td>
                          <td>Ramadan Food Packs</td>
                          <td className="fw-bold">৳3,000</td>
                          <td>2026-06-25</td>
                          <td><span className="badge bg-success">Success</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SETTINGS */}
              {activeTab === "settings" && (
                <div>
                  <h5 className="fw-bold mb-4">Account Settings</h5>
                  <form onSubmit={(e) => { e.preventDefault(); alert("Profile settings saved (mock)."); }}>
                    <div className="row g-3 mb-4">
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">First Name</label>
                        <input type="text" className="form-control" defaultValue={user.fullName ? user.fullName.split(" ")[0] : user.name.split(" ")[0]} />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Last Name</label>
                        <input type="text" className="form-control" defaultValue={user.fullName ? user.fullName.split(" ").slice(1).join(" ") : user.name.split(" ").slice(1).join(" ")} />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Email</label>
                        <input type="email" className="form-control" defaultValue={user.email} disabled />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small fw-semibold">Phone</label>
                        <input type="tel" className="form-control" defaultValue={user.phone} />
                      </div>
                    </div>

                    <h6 className="fw-bold mb-3">Notification Preferences</h6>
                    <div className="mb-4">
                      <div className="form-check form-switch mb-2">
                        <input className="form-check-input" type="checkbox" id="notifAnnounce" defaultChecked />
                        <label className="form-check-label small" htmlFor="notifAnnounce">Important Announcements</label>
                      </div>
                      <div className="form-check form-switch mb-2">
                        <input className="form-check-input" type="checkbox" id="notifJamat" defaultChecked />
                        <label className="form-check-label small" htmlFor="notifJamat">Prayer Time Changes</label>
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="notifEvents" />
                        <label className="form-check-label small" htmlFor="notifEvents">Nearby Community Events</label>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-mc">Save Changes</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
