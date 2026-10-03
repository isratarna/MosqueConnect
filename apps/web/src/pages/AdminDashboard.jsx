import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trans } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../hooks/useLocale";
import { apiRequest } from "../utils/api";
import { FACILITY_META } from "../data/mosques";
import { enumLabel, statusLabel } from "../utils/labels";
import { formatNumber } from "../utils/intl";
import CampaignManager from "../components/admin/CampaignManager";
import EventManager from "../components/admin/EventManager";

const TAB_KEYS = {
  overview: "admin.dashboard.tabs.overview",
  profile: "admin.dashboard.tabs.profile",
  prayer: "admin.dashboard.tabs.prayer",
  jummah: "admin.dashboard.tabs.jummah",
  announce: "admin.dashboard.tabs.announce",
  events: "admin.dashboard.tabs.events",
  facilities: "admin.dashboard.tabs.facilities",
  donations: "admin.dashboard.tabs.donations",
  volunteers: "admin.dashboard.tabs.volunteers",
};
const METRIC_KEYS = {
  followers_count: "admin.dashboard.metrics.followers_count",
  active_announcements_count: "admin.dashboard.metrics.active_announcements_count",
  upcoming_events_count: "admin.dashboard.metrics.upcoming_events_count",
  active_campaigns_count: "admin.dashboard.metrics.active_campaigns_count",
  pending_content_reports_count: "admin.dashboard.metrics.pending_content_reports_count",
};
const PROFILE_FIELDS = [
  ["name", "admin.dashboard.profileFields.name", "text"],
  ["address", "admin.dashboard.profileFields.address", "text"],
  ["phone", "admin.dashboard.profileFields.phone", "tel"],
  ["latitude", "admin.dashboard.profileFields.latitude", "number"],
  ["longitude", "admin.dashboard.profileFields.longitude", "number"],
];
const CONTENT_TYPES = ["announcement", "event", "campaign"];

export default function AdminDashboard() {
  const { t, locale } = useLocale();
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
      setMessage(t("admin.dashboard.saved"));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="container py-5" style={{ minHeight: "80vh" }}>
    <h1 className="h3 mb-4">{mosque?.name || t("profile.mosqueDashboard")}</h1>
    {managed.length > 1 && <div className="mb-3"><label className="form-label" htmlFor="admin-mosque">{t("admin.dashboard.managedMosque")}</label><select id="admin-mosque" className="form-select" value={mosqueId} onChange={(e) => setSelectedId(e.target.value)}>{managed.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>}
    {!mosqueId && <p><Trans i18nKey="admin.dashboard.noMosque" components={{ applications: <Link to="/profile" state={{ tab: "claims" }} /> }} /></p>}
    {error && <div className="alert alert-danger" role="alert">{error} <button className="btn btn-sm btn-outline-danger" onClick={() => setRevision((n) => n + 1)}>{t("common.retry")}</button></div>}
    {message && <div className="alert alert-success" role="status">{message}</div>}
    {loading && <p role="status">{t("admin.dashboard.loading")}</p>}
    {mosque && <div className="row g-4">
      <aside className="col-md-4 col-lg-3">
        <label className="form-label d-md-none" htmlFor="admin-section">{t("admin.dashboard.selectSection")}</label><select id="admin-section" className="form-select d-md-none mb-3" value={activeTab} onChange={(e) => { setActiveTab(e.target.value); setMessage(""); }}>{Object.entries(TAB_KEYS).map(([key, labelKey]) => <option key={key} value={key}>{t(labelKey)}</option>)}</select>
        <nav className="list-group d-none d-md-block" aria-label={t("admin.dashboard.sectionsLabel")}>{Object.entries(TAB_KEYS).map(([key, labelKey]) => <button type="button" key={key} className={`list-group-item list-group-item-action ${activeTab === key ? "active bg-mc" : ""}`} onClick={() => { setActiveTab(key); setMessage(""); }}>{t(labelKey)}</button>)}</nav>
      </aside>
      <div className="col-md-8 col-lg-9"><div className="card shadow-sm border-0 p-4" key={`${activeTab}-${mosqueId}`}>
        {activeTab === "overview" && <>
          <h2 className="h4 mb-3">{t(TAB_KEYS.overview)}</h2>
          <div className="row g-3 mb-4">{Object.entries(METRIC_KEYS).map(([key, labelKey]) => <div className="col-sm-6 col-lg-4" key={key}><div className="border rounded p-3 h-100"><strong className="h3 d-block">{formatNumber(overview?.summary?.[key] ?? 0, locale)}</strong><span>{t(labelKey)}</span></div></div>)}</div>
          <h3 className="h5">{t("admin.dashboard.recent")}</h3>
          {overview?.recent_content?.length ? overview.recent_content.map((item) => <div className="border-bottom py-3" key={`${item.type}-${item.id}`}><strong>{item.title}</strong><p className="small text-muted mb-0">{enumLabel(t, "admin.dashboard.contentTypes", CONTENT_TYPES, item.type)} · {statusLabel(t, item.status)}</p></div>) : <p className="text-muted">{t("admin.dashboard.noRecent")}</p>}
          <Link to={`/mosque/${mosqueId}`} className="btn btn-outline-mc mt-3">{t("admin.dashboard.viewPublic")}</Link>
        </>}
        {activeTab === "profile" && <form onSubmit={save}>
          <h2 className="h4 mb-4">{t(TAB_KEYS.profile)}</h2>
          {PROFILE_FIELDS.map(([key, labelKey, type]) => <div className="mb-3" key={key}><label className="form-label" htmlFor={`mosque-${key}`}>{t(labelKey)}</label><input id={`mosque-${key}`} name={key} type={type} className="form-control" defaultValue={mosque[key] || ""} required={key !== "phone"} step={type === "number" ? "any" : undefined} min={key === "latitude" ? -90 : key === "longitude" ? -180 : undefined} max={key === "latitude" ? 90 : key === "longitude" ? 180 : undefined} /></div>)}
          <div className="mb-3"><label htmlFor="mosque-description" className="form-label">{t("admin.dashboard.profileFields.description")}</label><textarea id="mosque-description" name="description" className="form-control" defaultValue={mosque.description || ""} /></div>
          <button className="btn btn-mc" disabled={busy}>{busy ? t("admin.dashboard.saving") : t("admin.dashboard.saveProfile")}</button>
        </form>}
        {activeTab === "facilities" && <form onSubmit={save}>
          <h2 className="h4 mb-4">{t(TAB_KEYS.facilities)}</h2>
          {Object.entries(FACILITY_META).map(([key, value]) => <label className="form-check mb-3" key={key}><input className="form-check-input" name="facilities" type="checkbox" value={key} defaultChecked={mosque.facilities?.some((item) => item.facility_key === key)} />{t(value.labelKey)}</label>)}
          <button className="btn btn-mc" disabled={busy}>{busy ? t("admin.dashboard.saving") : t("admin.dashboard.saveFacilities")}</button>
        </form>}
        {["prayer", "jummah"].includes(activeTab) && <><h2 className="h4">{t(TAB_KEYS[activeTab])}</h2><p>{t("admin.dashboard.prayerIntro")}</p><Link to={`/mosque-admin/prayer-schedule?mosque=${mosqueId}`} className="btn btn-mc">{t("admin.dashboard.openPrayer")}</Link></>}
        {activeTab === "announce" && <><h2 className="h4">{t(TAB_KEYS.announce)}</h2><p>{t("admin.dashboard.announceIntro")}</p><Link to={`/mosque-admin/announcements?mosque=${mosqueId}`} className="btn btn-mc">{t("admin.dashboard.openAnnouncements")}</Link></>}
        {activeTab === "events" && <EventManager mosqueId={mosqueId} />}
        {activeTab === "donations" && <CampaignManager mosqueId={mosqueId} />}
        {activeTab === "volunteers" && <><h2 className="h4">{t(TAB_KEYS.volunteers)}</h2><p>{t("admin.dashboard.volunteerIntro")}</p><Link to={`/volunteers?mosque=${mosqueId}`} className="btn btn-mc">{t("admin.dashboard.openVolunteers")}</Link></>}
      </div></div>
    </div>}
  </div>;
}
