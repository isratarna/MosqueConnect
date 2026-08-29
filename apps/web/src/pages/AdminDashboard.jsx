import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Activity,
  ArrowRight,
  BookOpen,
  Building,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  Edit,
  Eye,
  EyeOff,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  Plus,
  Save,
  Settings,
  ShoppingBag,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MOSQUES, saveMosqueToLocal, FACILITY_META } from "../data/mosques";
import {
  createAnnouncementId,
  getAnnouncementDetailsPath,
  getMosqueAnnouncementId,
} from "../data/announcements";
import { getAnnouncements, saveAnnouncements } from "../services/announcementService";
import CampaignManager from "../components/admin/CampaignManager";
import { fetchDashboardOverview, fetchRecentActivities } from "../services/adminDashboardService";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [mosque, setMosque] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Dashboard States
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  // Announcement States
  const [showAnnounceForm, setShowAnnounceForm] = useState(false);
  const [editingAnnounceId, setEditingAnnounceId] = useState(null);
  const [submittingAnnounce, setSubmittingAnnounce] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceBody, setAnnounceBody] = useState("");
  const [announceUrgency, setAnnounceUrgency] = useState("low");
  const [announceStatus, setAnnounceStatus] = useState("published");
  const [announceActionSuccess, setAnnounceActionSuccess] = useState("");
  const [deletingAnnounceId, setDeletingAnnounceId] = useState(null);

  const showAnnounceSuccess = (msg) => {
    setAnnounceActionSuccess(msg);
    setTimeout(() => setAnnounceActionSuccess(""), 3000);
  };

  // Initialize mosque profile associated with the admin user
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const managedMosque = user.managed_mosques?.[0];

    if (managedMosque) {
      const localMatch = MOSQUES.find(
        (item) => item.name.trim().toLowerCase() === managedMosque.name.trim().toLowerCase()
      );
      const mosqueId = localMatch?.id || managedMosque?.id || 1;
      setMosque({
        ...localMatch,
        ...managedMosque,
        announcements: getAnnouncements(mosqueId) || localMatch?.announcements || [],
        events: localMatch?.events || [],
      });
      return;
    }

    // Find mosque with matching name or load from localStorage custom mosques
    const found = MOSQUES.find(
      (m) => m.name.trim().toLowerCase() === user.mosqueName?.trim().toLowerCase()
    );

    if (found) {
      setMosque({
        ...found,
        announcements: getAnnouncements(found.id) || found.announcements || [],
      });
    } else {
      // Create a default mosque record for the admin
      const tempId = Date.now();
      const tempMosque = {
        id: tempId,
        name: user.mosqueName || "My Mosque Profile",
        address: user.mosqueAddress || "Mosque Address details",
        district: "Dhaka",
        area: "Local Area",
        lat: 23.7806,
        lng: 90.4074,
        photo: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=80",
        rating: 5.0,
        phone: user.phone || "+880 1711 000000",
        facilities: ["wudu", "parking"],
        prayer: { Fajr: "5:00", Dhuhr: "1:30", Asr: "5:00", Maghrib: "6:50", Isha: "8:15", Jummah: "1:30" },
        announcements: getAnnouncements(tempId) || [],
        events: [],
      };
      // Save it to make it available globally
      saveMosqueToLocal(tempMosque);
      setMosque(tempMosque);
    }
  }, [user, navigate]);

  // Fetch Dashboard Data when on Overview Tab
  useEffect(() => {
    if (mosque && activeTab === "overview" && !dashboardMetrics) {
      const loadDashboardData = async () => {
        setDashboardLoading(true);
        setDashboardError("");
        try {
          const overview = await fetchDashboardOverview(mosque.id);
          const activities = await fetchRecentActivities(mosque.id);
          
          if (overview && overview.metrics) {
            setDashboardMetrics(overview.metrics);
            // Optionally update the mosque state with the mock overview data
            if (overview.mosque) {
               setMosque((prev) => ({ ...prev, ...overview.mosque }));
            }
          }
          setRecentActivities(activities || []);
        } catch (err) {
          setDashboardError("Failed to load dashboard data. Please try again later.");
        } finally {
          setDashboardLoading(false);
        }
      };

      loadDashboardData();
    }
  }, [mosque, activeTab, dashboardMetrics]);

  // Guard access control
  if (!user || user.role !== "mosque_admin" || user.status !== "approved") {
    return (
      <div className="container py-5 text-center" style={{ minHeight: "60vh" }}>
        <div className="alert alert-danger max-w-md mx-auto p-4 shadow">
          <h4 className="fw-bold mb-2">Access Denied</h4>
          <p className="mb-3">You do not have permissions to view this Mosque Admin Dashboard.</p>
          <button className="btn btn-mc" onClick={() => navigate("/profile")}>Go to Profile</button>
        </div>
      </div>
    );
  }

  if (!mosque) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-mc" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const handleSave = (updatedMosque) => {
    setMosque(updatedMosque);
    saveMosqueToLocal(updatedMosque);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleAnnounceSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAnnounce(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    let updatedList = [...(mosque.announcements || [])];
    if (editingAnnounceId) {
      updatedList = updatedList.map(a => 
        a.id === editingAnnounceId ? { ...a, title: announceTitle, body: announceBody, urgency: announceUrgency, status: announceStatus, date: a.date } : a
      );
      showAnnounceSuccess("Announcement updated successfully!");
    } else {
      const newAnnounce = {
        id: createAnnouncementId(),
        title: announceTitle,
        body: announceBody,
        urgency: announceUrgency,
        status: announceStatus,
        date: new Date().toISOString().split("T")[0],
      };
      updatedList = [newAnnounce, ...updatedList];
      showAnnounceSuccess("Announcement created successfully!");
    }
    
    const updatedMosque = { ...mosque, announcements: updatedList };
    setMosque(updatedMosque);
    saveAnnouncements(updatedMosque.id, updatedList);
    // immediately update dashboard metric
    if (dashboardMetrics) {
      setDashboardMetrics({ ...dashboardMetrics, activeAnnouncements: updatedList.length });
    }
    
    setSubmittingAnnounce(false);
    setShowAnnounceForm(false);
  };

  const handleAnnounceDelete = () => {
    if (!deletingAnnounceId) return;
    const updatedList = (mosque.announcements || []).filter(a => a.id !== deletingAnnounceId);
    const updatedMosque = { ...mosque, announcements: updatedList };
    setMosque(updatedMosque);
    saveAnnouncements(updatedMosque.id, updatedList);
    if (dashboardMetrics) {
      setDashboardMetrics({ ...dashboardMetrics, activeAnnouncements: updatedList.length });
    }
    setDeletingAnnounceId(null);
    showAnnounceSuccess("Announcement deleted successfully.");
  };

  const handleToggleAnnounceStatus = (id) => {
    const updatedList = (mosque.announcements || []).map(a => {
      if (a.id === id) {
        return { ...a, status: a.status === "published" ? "draft" : "published" };
      }
      return a;
    });
    const updatedMosque = { ...mosque, announcements: updatedList };
    setMosque(updatedMosque);
    saveAnnouncements(updatedMosque.id, updatedList);
    showAnnounceSuccess("Announcement status updated!");
  };

  // Define sidebar menu options
  const menuItems = [
    { id: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
    { id: "profile", label: "Manage Mosque Profile", icon: Building },
    { id: "prayer", label: "Manage Prayer & Jamat", icon: Clock },
    { id: "jummah", label: "Manage Jummah", icon: BookOpen },
    { id: "announce", label: "Manage Announcements", icon: Megaphone },
    { id: "events", label: "Manage Events", icon: Calendar },
    { id: "facilities", label: "Manage Facilities", icon: Building2 },
    { id: "donations", label: "Donation Campaigns", icon: Coins },
    { id: "volunteers", label: "Volunteer Work", icon: HeartHandshake },
    { id: "goods", label: "Goods Requests", icon: ShoppingBag },
    { id: "followers", label: "View Followers", icon: Users },
    { id: "settings", label: "Mosque Settings", icon: Settings },
  ];

  return (
    <div className="container-fluid py-4 mc-motion-section" style={{ minHeight: "85vh" }}>
      <div className="row g-4">
        {/* HEADER BRANDING */}
        <div className="col-12 border-bottom pb-3 mb-2 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h2 className="fw-bold mb-0 text-mc">{mosque.name}</h2>
              <span className={`badge py-1.5 px-2.5 rounded ${mosque.status === 'Pending' ? 'bg-warning-subtle text-dark border border-warning-subtle' : 'bg-success-subtle text-success border border-success-subtle'}`}>
                {mosque.status || "Verified"} Admin
              </span>
            </div>
            <p className="text-slate-700 font-normal small mb-0 d-flex align-items-center gap-1">
              <Building size={14} /> {mosque.address || "Address not provided"}
            </p>
          </div>
          {saveSuccess && (
            <div className="alert alert-success py-1.5 px-3 mb-0 small d-flex align-items-center gap-2 shadow-sm animate-fade-in">
              <CheckCircle size={16} />
              <span>All changes saved successfully!</span>
            </div>
          )}
        </div>

        {/* SIDEBAR TABS (Left Section) */}
        <div className="col-md-4 col-lg-3">
          {/* Mobile view dropdown selector */}
          <div className="d-md-none mb-3">
            <label className="form-label small fw-bold">Select Section:</label>
            <select
              className="form-select border-mc"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              {menuItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop list group */}
          <div className="list-group shadow-sm d-none d-md-block border-0 bg-white rounded-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`list-group-item list-group-item-action border-0 py-3 px-4 d-flex align-items-center gap-3 fw-medium ${
                    activeTab === item.id ? "bg-mc text-white active" : "text-slate-700 font-medium hover:bg-slate-100"
                  }`}
                  style={{ borderRadius: "0" }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN PANEL CONTENT (Right Section) */}
        <div className="col-md-8 col-lg-9">
          <div className="card shadow-sm border-0 p-4 min-vh-60 mc-tab-panel" key={activeTab}>
            {/* OVERVIEW PANEL */}
            {activeTab === "overview" && (
              <div>
                <h4 className="fw-bold mb-4 border-bottom pb-2">Dashboard Overview</h4>
                
                {dashboardError && (
                  <div className="alert alert-danger py-2 px-3 mb-4 d-flex align-items-center gap-2 shadow-sm">
                    <AlertCircle size={18} />
                    <span>{dashboardError}</span>
                  </div>
                )}

                {dashboardLoading ? (
                  <div className="text-center py-5 my-5">
                    <div className="spinner-border text-mc" role="status">
                      <span className="visually-hidden">Loading overview...</span>
                    </div>
                    <p className="text-slate-700 font-normal small mt-3">Loading dashboard metrics...</p>
                  </div>
                ) : (
                  <>
                    {/* Stats Grid */}
                    <div className="row g-3 mb-4">
                      <div className="col-sm-6 col-lg-3">
                        <div className="p-3 border rounded-3 bg-light text-center h-100 d-flex flex-column justify-content-center shadow-sm">
                          <Users size={20} className="text-mc mb-2 mx-auto" />
                          <h6 className="!text-slate-800 font-bold uppercase tracking-wider text-xs mb-1" style={{ color: '#1e293b' }}>Total Followers</h6>
                          <h3 className="fw-bold mb-0 !text-slate-800" style={{ color: '#1e293b' }}>{dashboardMetrics?.totalFollowers || 0}</h3>
                        </div>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <div className="p-3 border rounded-3 bg-light text-center h-100 d-flex flex-column justify-content-center shadow-sm">
                          <Megaphone size={20} className="text-mc mb-2 mx-auto" />
                          <h6 className="!text-slate-800 font-bold uppercase tracking-wider text-xs mb-1" style={{ color: '#1e293b' }}>Active Announcements</h6>
                          <h3 className="fw-bold mb-0 !text-slate-800" style={{ color: '#1e293b' }}>{dashboardMetrics?.activeAnnouncements || 0}</h3>
                        </div>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <div className="p-3 border rounded-3 bg-light text-center h-100 d-flex flex-column justify-content-center shadow-sm">
                          <HeartHandshake size={20} className="text-mc mb-2 mx-auto" />
                          <h6 className="!text-slate-800 font-bold uppercase tracking-wider text-xs mb-1" style={{ color: '#1e293b' }}>Upcoming Volunteers</h6>
                          <h3 className="fw-bold mb-0 !text-slate-800" style={{ color: '#1e293b' }}>{dashboardMetrics?.upcomingVolunteers || 0}</h3>
                        </div>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <div className="p-3 border rounded-3 bg-light text-center h-100 d-flex flex-column justify-content-center shadow-sm">
                          <Activity size={20} className="text-mc mb-2 mx-auto" />
                          <h6 className="!text-slate-800 font-bold uppercase tracking-wider text-xs mb-1" style={{ color: '#1e293b' }}>Blood Requests</h6>
                          <h3 className="fw-bold mb-0 !text-slate-800" style={{ color: '#1e293b' }}>{dashboardMetrics?.activeBloodRequests || 0}</h3>
                        </div>
                      </div>
                    </div>

                    <div className="row g-4">
                      {/* Recent Activity Feed */}
                      <div className="col-lg-7">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                          <Clock size={18} className="text-mc" /> Recent Activity
                        </h5>
                        <div className="card border-0 bg-light p-0 shadow-sm overflow-hidden">
                          {recentActivities.length === 0 ? (
                            <div className="p-4 text-center text-slate-700 font-normal small">
                              No recent activities found.
                            </div>
                          ) : (
                            <div className="d-flex flex-column gap-2 p-3">
                              {recentActivities.map((activity) => (
                                <div key={activity.id} className="p-3 bg-slate-50 border border-slate-200 rounded" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                                  <div className="d-flex w-100 justify-content-between align-items-start mb-2">
                                    <h6 className="mb-0 !text-slate-900 font-bold" style={{ color: '#0f172a', fontWeight: 'bold' }}>{activity.title}</h6>
                                    <span className="!text-slate-600 !opacity-100 text-xs font-semibold" style={{ color: '#475569', opacity: 1 }}>
                                      {new Date(activity.timestamp).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="mb-2 !text-slate-800 !opacity-100 text-sm" style={{ color: '#1e293b', opacity: 1 }}>{activity.description}</p>
                                  <span className="badge !text-slate-800 !bg-slate-200 !border-slate-300 font-bold px-2 py-0.5 rounded text-xs" style={{ color: '#0f172a', backgroundColor: '#e2e8f0', borderColor: '#cbd5e1' }}>
                                    {activity.type.replace("_", " ").toUpperCase()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Shortcuts */}
                      <div className="col-lg-5">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                          <Settings size={18} className="text-mc" /> Quick Actions
                        </h5>
                        <div className="d-flex flex-column gap-2">
                          <Link to="/mosque-admin/prayer-schedule" className="btn btn-outline-mc text-start d-flex justify-content-between align-items-center w-100 p-3 shadow-sm bg-white text-slate-800 font-medium">
                            <span>Manage Prayer Schedule</span> <ArrowRight size={16} />
                          </Link>
                          <button onClick={() => setActiveTab("announce")} className="btn btn-outline-mc text-start d-flex justify-content-between align-items-center w-100 p-3 shadow-sm bg-white text-slate-800 font-medium">
                            <span>Create Announcement</span> <ArrowRight size={16} />
                          </button>
                          <button onClick={() => setActiveTab("volunteers")} className="btn btn-outline-mc text-start d-flex justify-content-between align-items-center w-100 p-3 shadow-sm bg-white text-slate-800 font-medium">
                            <span>Manage Volunteers</span> <ArrowRight size={16} />
                          </button>
                          <Link to="/blood-donation" className="btn btn-outline-mc text-start d-flex justify-content-between align-items-center w-100 p-3 shadow-sm bg-white text-slate-800 font-medium">
                            <span>View Community Blood Requests</span> <ArrowRight size={16} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* MOSQUE PROFILE PANEL */}
            {activeTab === "profile" && (
              <div>
                <h4 className="fw-bold mb-4 border-bottom pb-2">Manage Mosque Profile</h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSave({
                      ...mosque,
                      name: formData.get("name"),
                      address: formData.get("address"),
                      district: formData.get("district"),
                      area: formData.get("area"),
                      phone: formData.get("phone"),
                      photo: formData.get("photo"),
                    });
                  }}
                >
                  <div className="row g-3">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small fw-semibold">Mosque Name</label>
                      <input type="text" name="name" className="form-control" defaultValue={mosque.name} required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label small fw-semibold">Phone Number</label>
                      <input type="text" name="phone" className="form-control" defaultValue={mosque.phone} required />
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label small fw-semibold">Street Address</label>
                      <input type="text" name="address" className="form-control" defaultValue={mosque.address} required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label small fw-semibold">District</label>
                      <input type="text" name="district" className="form-control" defaultValue={mosque.district} required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label small fw-semibold">Area / Police Station</label>
                      <input type="text" name="area" className="form-control" defaultValue={mosque.area} required />
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label small fw-semibold">Cover Photo URL</label>
                      <input type="url" name="photo" className="form-control" defaultValue={mosque.photo} required />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-mc d-flex align-items-center gap-2 mt-2">
                    <Save size={16} />
                    Save Mosque Profile
                  </button>
                </form>
              </div>
            )}

            {/* PRAYER TIMES PANEL */}
            {activeTab === "prayer" && (
              <div className="text-center py-5">
                <Clock size={48} className="text-mc mx-auto mb-3" />
                <h4 className="fw-bold mb-2">Manage Prayer & Jamat Times</h4>
                <p className="text-slate-700 font-normal small mb-4">
                  We have moved prayer schedule management to a dedicated, expansive workspace.
                  From there you can set both Adhan and Iqamah times for all daily prayers.
                </p>
                <Link to="/mosque-admin/prayer-schedule" className="btn btn-mc d-inline-flex align-items-center gap-2">
                  Go to Prayer Schedule Hub
                </Link>
              </div>
            )}

            {/* JUMMAH SESSIONS PANEL */}
            {activeTab === "jummah" && (
              <div>
                <h4 className="fw-bold mb-4 border-bottom pb-2">Manage Jummah Sessions</h4>
                <p className="text-slate-700 font-normal small mb-3">
                  Setup Jamat times and Khateeb schedules for Jummah sessions on Fridays.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSave({
                      ...mosque,
                      prayer: {
                        ...mosque.prayer,
                        Jummah: formData.get("Jummah"),
                      },
                    });
                  }}
                >
                  <div className="row g-3 align-items-end mb-4">
                    <div className="col-sm-6 mb-3">
                      <label className="form-label small fw-semibold">Primary Jummah Time</label>
                      <input
                        type="text"
                        name="Jummah"
                        className="form-control"
                        defaultValue={mosque.prayer.Jummah || "1:15"}
                        required
                      />
                    </div>
                    <div className="col-sm-6 mb-3">
                      <button type="submit" className="btn btn-mc d-flex align-items-center gap-2 w-100 py-2.5">
                        <Save size={16} />
                        Update Jummah Time
                      </button>
                    </div>
                  </div>
                </form>

                <h5 className="fw-bold mb-3 border-top pt-4">Schedule of Sessions</h5>
                <div className="table-responsive">
                  <table className="table border align-middle small">
                    <thead className="table-light">
                      <tr>
                        <th>Session</th>
                        <th>Jamat Time</th>
                        <th>Khateeb / Speaker</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>First Session</strong></td>
                        <td>{mosque.prayer.Jummah || "1:15"}</td>
                        <td>Maulana Sheikh Abdullah</td>
                        <td><span className="badge bg-success">Confirmed</span></td>
                      </tr>
                      <tr>
                        <td><strong>Second Session</strong></td>
                        <td>2:00 PM (Mock)</td>
                        <td>Hafez Mohammad Al-Amin</td>
                        <td><span className="badge bg-secondary">TBD</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ANNOUNCEMENTS PANEL */}
            {activeTab === "announce" && (
              <div>
                <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-4">
                  <div>
                    <h4 className="fw-bold mb-1">Manage Announcements</h4>
                    <p className="text-slate-700 font-normal small mb-0">
                      Draft and publish updates directly to your community.
                    </p>
                  </div>
                  <button 
                    className="btn btn-mc d-flex align-items-center gap-2"
                    onClick={showAnnounceForm && !editingAnnounceId ? () => setShowAnnounceForm(false) : () => {
                      setEditingAnnounceId(null);
                      setAnnounceTitle("");
                      setAnnounceBody("");
                      setAnnounceUrgency("low");
                      setAnnounceStatus("published");
                      setShowAnnounceForm(true);
                    }}
                  >
                    {showAnnounceForm && !editingAnnounceId ? "Cancel Creation" : <><Plus size={16} /> New Announcement</>}
                  </button>
                </div>

                {announceActionSuccess && (
                  <div className="alert alert-success py-2 px-3 mb-4 d-flex align-items-center gap-2 shadow-sm animate-fade-in">
                    <CheckCircle size={18} />
                    <span>{announceActionSuccess}</span>
                  </div>
                )}

                {/* Create / Edit Form */}
                {showAnnounceForm && (
                  <div className="card border-0 shadow-sm mb-5 border-top border-4 border-mc bg-slate-50">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start mb-4">
                        <h5 className="fw-bold mb-0 text-slate-900">{editingAnnounceId ? "Edit Announcement" : "Create New Announcement"}</h5>
                        <button className="btn-close" onClick={() => setShowAnnounceForm(false)} aria-label="Close form"></button>
                      </div>
                      
                      <form onSubmit={handleAnnounceSubmit}>
                        <div className="row g-3">
                          <div className="col-md-12 mb-3">
                            <label className="form-label fw-semibold small text-slate-800">Title <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" placeholder="e.g. Mosque Renovation Progress" value={announceTitle} onChange={(e) => setAnnounceTitle(e.target.value)} required />
                          </div>
                          <div className="col-12 mb-3">
                            <label className="form-label fw-semibold small text-slate-800">Message Content <span className="text-danger">*</span></label>
                            <textarea className="form-control" rows="4" placeholder="Provide details about the announcement..." value={announceBody} onChange={(e) => setAnnounceBody(e.target.value)} required></textarea>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label fw-semibold small text-slate-800">Priority Level</label>
                            <select className="form-select" value={announceUrgency} onChange={(e) => setAnnounceUrgency(e.target.value)}>
                              <option value="low">Low (General Info)</option>
                              <option value="medium">Medium (Warning / Alert)</option>
                              <option value="high">High (Urgent)</option>
                            </select>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label fw-semibold small text-slate-800">Status</label>
                            <select className="form-select" value={announceStatus} onChange={(e) => setAnnounceStatus(e.target.value)}>
                              <option value="published">Published (Visible to all)</option>
                              <option value="draft">Draft (Hidden)</option>
                            </select>
                          </div>
                        </div>
                        <div className="d-flex justify-content-end gap-2 mt-3">
                          <button type="button" className="btn btn-light border" onClick={() => setShowAnnounceForm(false)} disabled={submittingAnnounce}>Cancel</button>
                          <button type="submit" className="btn btn-mc d-flex align-items-center gap-2" disabled={submittingAnnounce}>
                            {submittingAnnounce ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <CheckCircle size={16} />}
                            {submittingAnnounce ? "Saving..." : editingAnnounceId ? "Save Changes" : "Create Announcement"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Delete Confirmation Modal Overlay */}
                {deletingAnnounceId && (
                  <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="card shadow-lg border-0" style={{ maxWidth: '400px', width: '90%' }}>
                      <div className="card-header bg-white border-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold text-danger mb-0 d-flex align-items-center gap-2"><AlertCircle size={22} /> Confirm Deletion</h5>
                        <button type="button" className="btn-close" onClick={() => setDeletingAnnounceId(null)} aria-label="Close"></button>
                      </div>
                      <div className="card-body px-4 py-3">
                        <p className="mb-0 text-slate-700">Are you sure you want to permanently delete this announcement? This action cannot be undone.</p>
                      </div>
                      <div className="card-footer bg-white border-0 px-4 pb-4 pt-0 d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-light border" onClick={() => setDeletingAnnounceId(null)}>Cancel</button>
                        <button type="button" className="btn btn-danger" onClick={handleAnnounceDelete}>Yes, Delete</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Announcements List */}
                {(!mosque.announcements || mosque.announcements.length === 0) ? (
                  <div className="text-center py-5 border rounded shadow-sm bg-slate-50 mt-4">
                    <Megaphone size={48} className="mb-3 mx-auto text-slate-400" />
                    <h5 className="fw-bold text-slate-800">No Announcements</h5>
                    <p className="mb-0 text-slate-600 font-medium">You haven't posted any announcements yet.</p>
                    <button className="btn btn-outline-mc mt-3" onClick={() => {
                      setEditingAnnounceId(null);
                      setShowAnnounceForm(true);
                    }}>Create Your First</button>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {mosque.announcements.map((announce) => (
                      <div className={`card border-0 shadow-sm overflow-hidden border-start border-4 ${announce.status === 'published' ? 'border-success' : 'border-warning'}`} key={announce.id}>
                        <div className="card-body p-4 bg-white">
                          <div className="row align-items-center gap-3 gap-md-0">
                            <div className="col-md-9">
                              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                <h5 className="fw-bold mb-0 text-slate-900">{announce.title}</h5>
                                <span className={`badge ${announce.status === 'published' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-dark border border-warning-subtle'}`}>
                                  {announce.status === 'published' ? 'Published' : 'Draft'}
                                </span>
                                {announce.urgency === 'high' && <span className="badge bg-danger">Urgent</span>}
                              </div>
                              <p className="small mb-3 text-slate-700 font-normal">{announce.body}</p>
                              <div className="d-flex align-items-center gap-2 small text-slate-600 font-medium">
                                <Clock size={14} /> <span>Posted: {announce.date}</span>
                                {announce.urgency !== 'low' && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span>Priority: <span className="text-capitalize">{announce.urgency}</span></span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="d-flex flex-md-column flex-row gap-2 justify-content-end align-items-stretch align-items-md-end h-100 mt-2 mt-md-0">
                                <button 
                                  className={`btn btn-sm ${announce.status === 'published' ? 'btn-outline-warning' : 'btn-outline-success'} d-flex align-items-center justify-content-center gap-2 w-100`}
                                  onClick={() => handleToggleAnnounceStatus(announce.id)}
                                >
                                  {announce.status === 'published' ? <><EyeOff size={14} /> Unpublish</> : <><Eye size={14} /> Publish</>}
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2 w-100 text-slate-700 font-medium"
                                  onClick={() => {
                                    setEditingAnnounceId(announce.id);
                                    setAnnounceTitle(announce.title);
                                    setAnnounceBody(announce.body);
                                    setAnnounceUrgency(announce.urgency || "low");
                                    setAnnounceStatus(announce.status || "published");
                                    setShowAnnounceForm(true);
                                  }}
                                >
                                  <Edit size={14} /> Edit
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center gap-2 w-100"
                                  onClick={() => setDeletingAnnounceId(announce.id)}
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* EVENTS PANEL */}
            {activeTab === "events" && (
              <div>
                <h4 className="fw-bold mb-4 border-bottom pb-2">Manage Events</h4>

                {/* Add event form */}
                <h5 className="fw-bold text-mc mb-3">Schedule New Event</h5>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const newEvent = {
                      title: formData.get("title"),
                      when: formData.get("when"),
                      desc: formData.get("desc"),
                    };
                    const list = mosque.events || [];
                    handleSave({ ...mosque, events: [...list, newEvent] });
                    e.currentTarget.reset();
                  }}
                  className="mb-5 p-3 border rounded bg-light"
                >
                  <div className="row g-3">
                    <div className="col-md-6 mb-3">
                      <label className="form-label small fw-semibold">Event Title</label>
                      <input type="text" name="title" className="form-control text-start" placeholder="e.g. Tafsir Al-Quran Class" required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label small fw-semibold">Schedule Time</label>
                      <input type="text" name="when" className="form-control text-start" placeholder="e.g. Every Saturday, after Asr" required />
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label small fw-semibold">Description</label>
                      <textarea name="desc" className="form-control text-start" rows={3} placeholder="Provide session topics and prerequisites..." required></textarea>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-mc d-flex align-items-center gap-2">
                    <Plus size={16} /> Schedule Event
                  </button>
                </form>

                {/* List events */}
                <h5 className="fw-bold mb-3">Current Events</h5>
                {(!mosque.events || mosque.events.length === 0) ? (
                  <p className="text-slate-700 font-normal small">No events scheduled.</p>
                ) : (
                  <div className="row g-3">
                    {mosque.events.map((evt, idx) => (
                      <div className="col-md-6" key={idx}>
                        <div className="card p-3 h-100 border shadow-sm">
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div>
                              <h6 className="fw-bold mb-1 text-mc">{evt.title}</h6>
                              <p className="text-slate-700 font-normal small mb-2 fw-semibold">{evt.when}</p>
                              <p className="small text-slate-700 font-normal mb-0">{evt.desc}</p>
                            </div>
                            <button
                              onClick={() => {
                                const list = [...mosque.events];
                                list.splice(idx, 1);
                                handleSave({ ...mosque, events: list });
                              }}
                              className="btn btn-sm btn-outline-danger border-0"
                              title="Delete Event"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FACILITIES PANEL */}
            {activeTab === "facilities" && (
              <div>
                <h4 className="fw-bold mb-4 border-bottom pb-2">Manage Facilities</h4>
                <p className="text-slate-700 font-normal small mb-4">
                  Select the services and amenities available to community members at this mosque.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const selected = [];
                    Object.keys(FACILITY_META).forEach((key) => {
                      if (formData.get(key)) {
                        selected.push(key);
                      }
                    });
                    handleSave({ ...mosque, facilities: selected });
                  }}
                >
                  <div className="row g-2 mb-4">
                    {Object.entries(FACILITY_META).map(([key, meta]) => {
                      const isChecked = mosque.facilities?.includes(key);
                      return (
                        <div className="col-sm-6 mb-2" key={key}>
                          <div className="form-check p-2 border rounded bg-light-subtle ps-4">
                            <input
                              className="form-check-input ms-0 me-2"
                              type="checkbox"
                              name={key}
                              id={`facility-${key}`}
                              defaultChecked={isChecked}
                            />
                            <label className="form-check-label small fw-semibold" htmlFor={`facility-${key}`}>
                              {meta.label}
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button type="submit" className="btn btn-mc d-flex align-items-center gap-2">
                    <Save size={16} /> Save Facilities
                  </button>
                </form>
              </div>
            )}

            {/* DONATION CAMPAIGNS PANEL */}
            {activeTab === "donations" && <CampaignManager mosqueId={mosque.id} />}

            {/* VOLUNTEER OPPORTUNITIES PANEL */}
            {activeTab === "volunteers" && (
              <div>
                <h4 className="fw-bold mb-4 border-bottom pb-2">Manage Volunteer Opportunities</h4>
                <p className="text-slate-700 font-normal small mb-4">
                  Request helpers for crowd control, event preparation, disaster relief shipments, and cleanups.
                </p>

                <div className="list-group list-group-flush border rounded mb-4">
                  <div className="list-group-item d-flex justify-content-between align-items-center py-3">
                    <div>
                      <h6 className="fw-bold mb-1">Jummah Parking Volunteers</h6>
                      <p className="mb-0 text-slate-700 font-normal small">Need 5 assistants every Friday for crowd assistance.</p>
                    </div>
                    <span className="badge bg-mc text-white py-2">3 Signed Up</span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between align-items-center py-3">
                    <div>
                      <h6 className="fw-bold mb-1">Disaster Relief Package Packing</h6>
                      <p className="mb-0 text-slate-700 font-normal small">Weekend grouping. Sort food dry bags.</p>
                    </div>
                    <span className="badge bg-success py-2">Completed</span>
                  </div>
                </div>
              </div>
            )}

            {/* GOODS REQUESTS PANEL */}
            {activeTab === "goods" && (
              <div>
                <h4 className="fw-bold mb-4 border-bottom pb-2">Manage Goods Requests</h4>
                <p className="text-slate-700 font-normal small mb-4">
                  Publish requests for physical resources required in classrooms, prayer halls, or storage facilities.
                </p>

                <div className="table-responsive">
                  <table className="table table-hover border align-middle small">
                    <thead className="table-light">
                      <tr>
                        <th>Item Requested</th>
                        <th>Required Qty</th>
                        <th>Purpose</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Wheelchairs for elderly</strong></td>
                        <td>4 units</td>
                        <td>For primary prayer hall accessibility</td>
                        <td><span className="badge bg-warning text-dark">Pending</span></td>
                      </tr>
                      <tr>
                        <td><strong>Quran Copies (Majeed)</strong></td>
                        <td>50 books</td>
                        <td>For primary kids weekend class lessons</td>
                        <td><span className="badge bg-success">Fulfilled</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW FOLLOWERS PANEL */}
            {activeTab === "followers" && (
              <div>
                <h4 className="fw-bold mb-4 border-bottom pb-2">View Followers</h4>
                <p className="text-slate-700 font-normal small mb-4">
                  These community members have followed your mosque. They receive notification digests and announcements on their dashboards.
                </p>

                <div className="table-responsive">
                  <table className="table table-hover align-middle border small">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Follow Date</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="fw-semibold">Kamal Hossain</td>
                        <td>kamal.hossain@gmail.com</td>
                        <td>2026-07-15</td>
                        <td>Regular User</td>
                      </tr>
                      <tr>
                        <td className="fw-semibold">Fariha Rahman</td>
                        <td>fariha123@yahoo.com</td>
                        <td>2026-07-10</td>
                        <td>Regular User</td>
                      </tr>
                      <tr>
                        <td className="fw-semibold">Zayn Ahmed</td>
                        <td>zayn.ahmed@outlook.com</td>
                        <td>2026-07-08</td>
                        <td>Regular User</td>
                      </tr>
                      <tr>
                        <td className="fw-semibold">Taskin Kabir</td>
                        <td>taskin.kabir@gmail.com</td>
                        <td>2026-07-02</td>
                        <td>Regular User</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MOSQUE SETTINGS PANEL */}
            {activeTab === "settings" && (
              <div>
                <h4 className="fw-bold mb-4 border-bottom pb-2">Mosque Settings</h4>
                <form onSubmit={(e) => { e.preventDefault(); handleSave({ ...mosque }); }}>
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3">Privacy & Profile Visibility</h6>
                    <div className="form-check form-switch mb-2">
                      <input className="form-check-input" type="checkbox" id="publicView" defaultChecked />
                      <label className="form-check-label small" htmlFor="publicView">Publicly Visible (Allows browse & search discovery)</label>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="acceptDonations" defaultChecked />
                      <label className="form-check-label small" htmlFor="acceptDonations">Enable Donation Button on Profile Page</label>
                    </div>
                  </div>

                  <div className="mb-4 border-top pt-4">
                    <h6 className="fw-bold mb-3">Notification Digests</h6>
                    <div className="form-check mb-2">
                      <input className="form-check-input" type="radio" name="digestCycle" id="cycleWeekly" defaultChecked />
                      <label className="form-check-label small" htmlFor="cycleWeekly">Weekly email summary of active volunteers & campaigns</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="digestCycle" id="cycleMonthly" />
                      <label className="form-check-label small" htmlFor="cycleMonthly">Monthly email summary only</label>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-mc d-flex align-items-center gap-2">
                    <Save size={16} /> Save Admin Settings
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
