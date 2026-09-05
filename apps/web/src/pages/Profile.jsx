import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFollowedMosques } from "../context/FollowContext";
import MosqueCard from "../components/MosqueCard";
import { apiRequest } from "../utils/api";
import { formatCampaignMoney as formatMoney } from "../utils/campaignFormat";

const tabs = { followed: "Followed Mosques", activity: "Event Registrations", donations: "Donations", claims: "Mosque Applications", settings: "Settings" };
const endpoints = { activity: "/api/me/event-registrations", donations: "/api/me/donations", claims: "/api/me/mosque-claims" };

export default function Profile() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const follows = useFollowedMosques();
  const [activeTab, setActiveTab] = useState(location.state?.tab || "followed");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    setError("");
    setMessage("");
    setItems([]);
    if (!endpoints[activeTab]) return;
    const controller = new AbortController();
    setLoading(true);
    apiRequest(endpoints[activeTab], { signal: controller.signal })
      .then((data) => setItems(data.data || []))
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeTab, user?.id, revision]);

  async function saveProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await apiRequest("/api/auth/me", { method: "PATCH", body: { name: form.get("name").trim(), email: form.get("email").trim() || null } });
      updateUser(data.user);
      setMessage("Your profile has been saved.");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  if (!user) return null;
  return (
    <div className="container py-5" style={{ minHeight: "80vh" }}>
      <div className="row g-4">
        <aside className="col-lg-3">
          <div className="card border-0 shadow-sm p-4">
            <h1 className="h4 fw-bold text-break">{user.name}</h1>
            <p className="text-muted text-break">{user.phone}</p>
            <p className="small text-break">{user.email}</p>
            {user.role === "mosque_admin" && user.status === "approved" && <Link className="btn btn-mc mb-3" to="/admin/dashboard">Mosque Dashboard</Link>}
            {user.role === "super_admin" && <Link className="btn btn-mc mb-3" to="/super-admin/dashboard">System Dashboard</Link>}
            <Link to="/browse">Find a mosque</Link>
          </div>
        </aside>
        <div className="col-lg-9">
          <div className="card border-0 shadow-sm">
            <nav className="nav nav-tabs px-3 pt-3" aria-label="Profile sections">
              {Object.entries(tabs).map(([key, label]) => <button type="button" key={key} className={`nav-link ${activeTab === key ? "active" : ""}`} aria-current={activeTab === key ? "page" : undefined} onClick={() => setActiveTab(key)}>{label}</button>)}
            </nav>
            <div className="card-body p-4">
              <h2 className="h5 mb-4">{tabs[activeTab]}</h2>
              {error && <div className="alert alert-danger" role="alert">{error} {endpoints[activeTab] && <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => setRevision((n) => n + 1)}>Retry</button>}</div>}
              {message && <div className="alert alert-success" role="status">{message}</div>}
              {activeTab === "followed" && <>
                {follows.loading && <p role="status">Loading followed mosques...</p>}
                {follows.error && <div className="alert alert-danger" role="alert">{follows.error} <button className="btn btn-sm btn-outline-danger" onClick={follows.refreshFollowedMosques}>Retry</button></div>}
                {!follows.loading && !follows.error && follows.followedMosques.length === 0 && <p>You are not following any mosques yet. <Link to="/browse">Browse mosques</Link> to get started.</p>}
                <div className="row g-3">{follows.followedMosques.map((mosque) => <div className="col-md-6" key={mosque.id}><MosqueCard mosque={mosque} /></div>)}</div>
              </>}
              {endpoints[activeTab] && <>
                {loading && <p role="status">Loading...</p>}
                {!loading && !error && items.length === 0 && <p className="text-muted">No {activeTab === "activity" ? "event registrations" : activeTab === "claims" ? "mosque applications" : "donations"} yet.</p>}
                {!loading && items.map((item) => <div className="border rounded p-3 mb-3" key={item.id}>
                  {activeTab === "activity" && (item.event ? <Link to={`/community/events/${item.event_id}`}>{item.event.title}</Link> : <span>Event registration #{item.event_id}</span>)}
                  {activeTab === "donations" && <><Link to={`/campaigns/${item.campaign_id}`}>{item.campaign?.title || "Campaign"}</Link><p className="mb-0 mt-2">{formatMoney(item.amount, item.campaign?.currency || "BDT")} · {item.status}</p></>}
                  {activeTab === "claims" && <><strong>{item.mosque?.name || `Mosque #${item.mosque_id}`}</strong><p className="mb-0 mt-2">Status: {item.status}</p>{item.review_note && <p className="mb-0">{item.review_note}</p>}</>}
                </div>)}
                {activeTab === "claims" && <p>To apply as a mosque administrator, open your <Link to="/browse">mosque profile</Link> and submit an application with your supporting document.</p>}
                {activeTab === "donations" && <p className="small text-muted">Pledges are confirmed by mosque administrators. <Link to="/campaigns">View campaigns</Link>.</p>}
              </>}
              {activeTab === "settings" && <form onSubmit={saveProfile}>
                <div className="mb-3"><label className="form-label" htmlFor="profile-name">Full name</label><input id="profile-name" className="form-control" name="name" defaultValue={user.name} required maxLength={255} /></div>
                <div className="mb-3"><label className="form-label" htmlFor="profile-email">Email (optional)</label><input id="profile-email" className="form-control" type="email" name="email" defaultValue={user.email || ""} maxLength={255} /></div>
                <div className="mb-4"><label className="form-label" htmlFor="profile-phone">Verified phone</label><input id="profile-phone" className="form-control" value={user.phone} readOnly /><p className="form-text">Your phone number is used to verify your identity when you log in.</p></div>
                <button className="btn btn-mc" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
              </form>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
