import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";
import { FACILITY_META } from "../data/mosques";
import CampaignManager from "../components/admin/CampaignManager";
import EventManager from "../components/admin/EventManager";

const tabs = { overview: "Dashboard Overview", profile: "Manage Mosque Profile", prayer: "Manage Prayer & Jamat", jummah: "Manage Jummah", announce: "Manage Announcements", events: "Manage Events", facilities: "Manage Facilities", donations: "Donation Campaigns", volunteers: "Volunteer Work" };
const metrics = { followers_count: "Followers", active_announcements_count: "Active announcements", upcoming_events_count: "Upcoming events", active_campaigns_count: "Active campaigns", pending_content_reports_count: "Pending reports" };

export default function AdminDashboard() {
  const { user } = useAuth();
  const managed = user?.managed_mosques || [];
  const [selectedId, setSelectedId] = useState("");
  const mosqueId = selectedId || managed[0]?.id;
  const [activeTab, setActiveTab] = useState("overview");
  const [mosque, setMosque] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!mosqueId) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(""); setMosque(null);
    Promise.all([
      apiRequest(`/api/admin/mosques/${mosqueId}`, { signal: controller.signal }),
      apiRequest(`/api/admin/mosques/${mosqueId}/dashboard`, { signal: controller.signal }),
    ]).then(([profile, dashboard]) => { setMosque(profile.mosque); setOverview(dashboard.data); })
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [mosqueId, revision]);

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const body = activeTab === "facilities" ? { facilities: data.getAll("facilities") } : Object.fromEntries(data);
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest(`/api/admin/mosques/${mosqueId}`, { method: "PATCH", body });
      setMosque(result.mosque);
      setMessage("Changes saved successfully.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="container py-5" style={{ minHeight: "80vh" }}>
    <h1 className="h3 mb-4">{mosque?.name || "Mosque Dashboard"}</h1>
    {managed.length > 1 && <div className="mb-3"><label className="form-label" htmlFor="admin-mosque">Managed mosque</label><select id="admin-mosque" className="form-select" value={mosqueId} onChange={(e) => setSelectedId(e.target.value)}>{managed.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>}
    {!mosqueId && <p>No mosque is assigned to this account. <Link to="/profile" state={{ tab: "claims" }}>View applications</Link>.</p>}
    {error && <div className="alert alert-danger" role="alert">{error} <button className="btn btn-sm btn-outline-danger" onClick={() => setRevision((n) => n + 1)}>Retry</button></div>}
    {message && <div className="alert alert-success" role="status">{message}</div>}
    {loading && <p role="status">Loading dashboard...</p>}
    {mosque && <div className="row g-4">
      <aside className="col-md-4 col-lg-3">
        <label className="form-label d-md-none" htmlFor="admin-section">Select section</label><select id="admin-section" className="form-select d-md-none mb-3" value={activeTab} onChange={(e) => { setActiveTab(e.target.value); setMessage(""); }}>{Object.entries(tabs).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <nav className="list-group d-none d-md-block" aria-label="Dashboard sections">{Object.entries(tabs).map(([key, label]) => <button type="button" key={key} className={`list-group-item list-group-item-action ${activeTab === key ? "active bg-mc" : ""}`} onClick={() => { setActiveTab(key); setMessage(""); }}>{label}</button>)}</nav>
      </aside>
      <div className="col-md-8 col-lg-9"><div className="card shadow-sm border-0 p-4" key={`${activeTab}-${mosqueId}`}>
        {activeTab === "overview" && <>
          <h2 className="h4 mb-3">Dashboard Overview</h2>
          <div className="row g-3 mb-4">{Object.entries(metrics).map(([key, label]) => <div className="col-sm-6 col-lg-4" key={key}><div className="border rounded p-3 h-100"><strong className="h3 d-block">{overview?.summary?.[key] ?? 0}</strong><span>{label}</span></div></div>)}</div>
          <h3 className="h5">Recent content</h3>
          {overview?.recent_content?.length ? overview.recent_content.map((item) => <div className="border-bottom py-3" key={`${item.type}-${item.id}`}><strong>{item.title}</strong><p className="small text-muted mb-0">{item.type} · {item.status}</p></div>) : <p className="text-muted">No recent content.</p>}
          <Link to={`/mosque/${mosqueId}`} className="btn btn-outline-mc mt-3">View public profile</Link>
        </>}
        {activeTab === "profile" && <form onSubmit={save}>
          <h2 className="h4 mb-4">Manage Mosque Profile</h2>
          {[["name", "Mosque name", "text"], ["address", "Street address", "text"], ["phone", "Phone number", "tel"], ["latitude", "Latitude", "number"], ["longitude", "Longitude", "number"]].map(([key, label, type]) => <div className="mb-3" key={key}><label className="form-label" htmlFor={`mosque-${key}`}>{label}</label><input id={`mosque-${key}`} name={key} type={type} className="form-control" defaultValue={mosque[key] || ""} required={key !== "phone"} step={type === "number" ? "any" : undefined} min={key === "latitude" ? -90 : key === "longitude" ? -180 : undefined} max={key === "latitude" ? 90 : key === "longitude" ? 180 : undefined} /></div>)}
          <div className="mb-3"><label htmlFor="mosque-description" className="form-label">Description</label><textarea id="mosque-description" name="description" className="form-control" defaultValue={mosque.description || ""} /></div>
          <button className="btn btn-mc" disabled={busy}>{busy ? "Saving..." : "Save Mosque Profile"}</button>
        </form>}
        {activeTab === "facilities" && <form onSubmit={save}>
          <h2 className="h4 mb-4">Manage Facilities</h2>
          {Object.entries(FACILITY_META).map(([key, value]) => <label className="form-check mb-3" key={key}><input className="form-check-input" name="facilities" type="checkbox" value={key} defaultChecked={mosque.facilities?.some((item) => item.facility_key === key)} />{value.label}</label>)}
          <button className="btn btn-mc" disabled={busy}>{busy ? "Saving..." : "Save Facilities"}</button>
        </form>}
        {["prayer", "jummah"].includes(activeTab) && <><h2 className="h4">{tabs[activeTab]}</h2><p>Update the prayer schedule and first Jumuah session displayed on your mosque profile.</p><Link to={`/mosque-admin/prayer-schedule?mosque=${mosqueId}`} className="btn btn-mc">Open prayer schedule</Link></>}
        {activeTab === "announce" && <><h2 className="h4">Manage Announcements</h2><p>Publish mosque updates, including requests for goods and community support.</p><Link to={`/mosque-admin/announcements?mosque=${mosqueId}`} className="btn btn-mc">Open announcements</Link></>}
        {activeTab === "events" && <EventManager mosqueId={mosqueId} />}
        {activeTab === "donations" && <CampaignManager mosqueId={mosqueId} />}
        {activeTab === "volunteers" && <><h2 className="h4">Volunteer Work</h2><p>Create opportunities and manage your mosque's volunteering activities.</p><Link to={`/volunteers?mosque=${mosqueId}`} className="btn btn-mc">Open volunteer opportunities</Link></>}
      </div></div>
    </div>}
  </div>;
}
