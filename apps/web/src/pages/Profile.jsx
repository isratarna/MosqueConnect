import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Check, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFollowedMosques } from "../context/FollowContext";
import MosqueCard from "../components/MosqueCard";
import { Trans } from "react-i18next";
import { apiRequest } from "../utils/api";
import { formatCampaignMoney as formatMoney } from "../utils/campaignFormat";
import { respondToInvite } from "../utils/teamApi";
import { describeValue } from "../utils/suggestionFormat";
import { roleLabel } from "../utils/teamRoles";
import { TrustedBadge } from "../components/suggestions/SuggestionReviewList";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS, GOODS_STATUS, LOST_FOUND_STATUS, labelOf } from "../utils/communityHubApi";
import { ListRowsSkeleton, MosqueCardSkeleton, SkeletonRegion } from "../components/skeletons";
import MySuggestedMosques from "../components/profile/MySuggestedMosques";
import { MyBloodRequestsTab, MyBloodResponsesTab, VolunteeringTab } from "../components/profile/ProfileTabs";
import { statusLabel } from "../utils/labels";
import { translate } from "../i18n/translate";
import { useLocale } from "../hooks/useLocale";

const tabs = {
  followed: "profile.tabs.followed",
  invites: "profile.tabs.invites",
  activity: "profile.tabs.activity",
  donations: "profile.tabs.donations",
  suggestions: "profile.tabs.suggestions",
  feedback: "profile.tabs.feedback",
  lostfound: "profile.tabs.lostfound",
  claims: "profile.tabs.claims",
  volunteering: "profile.tabs.volunteering",
  "blood-requests": "profile.tabs.bloodRequests",
  "blood-responses": "profile.tabs.bloodResponses",
  settings: "profile.tabs.settings",
};
const endpoints = { invites: "/api/me/mosque-invites", activity: "/api/me/event-registrations", donations: "/api/me/donations", suggestions: "/api/me/suggestions", feedback: "/api/me/complaints", lostfound: "/api/lost-found/me", claims: "/api/me/mosque-claims" };
const SUGGESTION_STATUS = { pending: ["Waiting for review", "bg-warning text-dark"], accepted: ["Accepted", "bg-success"], rejected: ["Not accepted", "bg-secondary"] };

export default function Profile() {
  const { t, locale } = useLocale();
  const { user, updateUser, refreshUser } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const follows = useFollowedMosques();
  const requestedTab = searchParams.get("tab") || location.state?.tab;
  const [activeTab, setActiveTab] = useState(tabs[requestedTab] ? requestedTab : "followed");
  const [busyInvite, setBusyInvite] = useState(null);

  // [Urmee · F6 Part 3] The active tab lives in the URL (/profile?tab=blood-requests), so other pages can link straight to it.
  const selectTab = (key) => {
    setActiveTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  // Notification links (?tab=invites) can change the tab while the page is open.
  useEffect(() => {
    if (tabs[requestedTab]) setActiveTab(requestedTab);
  }, [requestedTab]);
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

  async function answerInvite(invite, accept) {
    setBusyInvite(invite.id);
    setError("");
    setMessage("");
    try {
      const data = await respondToInvite(invite.id, accept);
      setItems((current) => current.filter((item) => item.id !== invite.id));
      setMessage(accept ? `${data.message} You can now open the Mosque Dashboard.` : data.message);
      await refreshUser();
    } catch (err) { setError(err.message); }
    finally { setBusyInvite(null); }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await apiRequest("/api/auth/me", { method: "PATCH", body: { name: form.get("name").trim(), email: form.get("email").trim() || null } });
      updateUser(data.user);
      setMessage(translate("profile.saved"));
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
            {user.trusted_contributor && <p><TrustedBadge /></p>}
            {user.role === "mosque_admin" && user.status === "approved" && <Link className="btn btn-mc mb-3" to="/admin/dashboard">{t("profile.mosqueDashboard")}</Link>}
            {user.role === "super_admin" && <Link className="btn btn-mc mb-3" to="/super-admin/dashboard">{t("profile.systemDashboard")}</Link>}
            <Link to="/browse">{t("profile.findMosque")}</Link>
          </div>
        </aside>
        <div className="col-lg-9">
          <div className="card border-0 shadow-sm">
            <nav className="nav nav-tabs px-3 pt-3 mc-profile-tabs" aria-label={t("profile.sections")}>
              {Object.entries(tabs).map(([key, labelKey]) => <button type="button" key={key} className={`nav-link ${activeTab === key ? "active" : ""}`} aria-current={activeTab === key ? "page" : undefined} onClick={() => selectTab(key)}>{t(labelKey)}{key === "invites" && user.pending_mosque_invites_count > 0 && <span className="badge bg-danger ms-1">{user.pending_mosque_invites_count}</span>}</button>)}
            </nav>
            <div className="card-body p-4">
              <h2 className="h5 mb-4">{t(tabs[activeTab])}</h2>
              {error && <div className="alert alert-danger" role="alert">{error} {endpoints[activeTab] && <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => setRevision((n) => n + 1)}>{t("common.retry")}</button>}</div>}
              {message && <div className="alert alert-success" role="status">{message}</div>}
              {activeTab === "followed" && <>
                <SkeletonRegion label={t("profile.loadingFollowed")} loading={follows.loading}><div className="row g-3">{[0, 1].map((key) => <div className="col-md-6" key={key}><MosqueCardSkeleton /></div>)}</div></SkeletonRegion>
                {follows.error && <div className="alert alert-danger" role="alert">{follows.error} <button className="btn btn-sm btn-outline-danger" onClick={follows.refreshFollowedMosques}>{t("common.retry")}</button></div>}
                {!follows.loading && !follows.error && follows.followedMosques.length === 0 && <p><Trans i18nKey="profile.noFollowed" components={{ browse: <Link to="/browse" /> }} /></p>}
                <div className="row g-3">{follows.followedMosques.map((mosque) => <div className="col-md-6" key={mosque.id}><MosqueCard mosque={mosque} /></div>)}</div>
              </>}
              {endpoints[activeTab] && <>
                <SkeletonRegion label={t("common.loading")} loading={loading}><ListRowsSkeleton rows={3} /></SkeletonRegion>
                {!loading && !error && items.length === 0 && <p className="text-muted">{t(`profile.empty.${activeTab}`)}</p>}
                {!loading && items.map((item) => <div className="border rounded p-3 mb-3" key={item.id}>
                  {activeTab === "activity" && (item.event ? <Link to={`/community/events/${item.event_id}`}>{item.event.title}</Link> : <span>{t("profile.eventRegistration", { id: item.event_id })}</span>)}
                  {activeTab === "donations" && <><Link to={`/campaigns/${item.campaign_id}`}>{item.campaign?.title || t("profile.campaignFallback")}</Link><p className="mb-0 mt-2">{formatMoney(item.amount, item.campaign?.currency || "BDT", locale)} · {statusLabel(t, item.status)}</p></>}
                  {activeTab === "claims" && <><strong>{item.mosque?.name || t("profile.mosqueFallback", { id: item.mosque_id })}</strong><p className="mb-0 mt-2">{t("profile.claimStatus", { status: statusLabel(t, item.status) })}</p>{item.review_note && <p className="mb-0">{item.review_note}</p>}</>}
                  {activeTab === "invites" && <div className="d-flex flex-wrap align-items-center gap-3">
                    <div className="me-auto min-w-0">
                      <Link to={`/mosque/${item.mosque_id}`} className="fw-semibold">{item.mosque?.name || `Mosque #${item.mosque_id}`}</Link>
                      <p className="mb-0 small text-muted">{item.invited_by?.name || "A mosque admin"} invited you to join the team as <strong>{roleLabel(item.role)}</strong>.</p>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-sm btn-mc" disabled={busyInvite !== null} onClick={() => answerInvite(item, true)}><Check size={14} aria-hidden="true" /> {t("profile.accept")}</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busyInvite !== null} onClick={() => answerInvite(item, false)}><X size={14} aria-hidden="true" /> {t("profile.decline")}</button>
                    </div>
                  </div>}
                  {activeTab === "feedback" && <>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <Link to={`/mosque/${item.mosque_id}`} className="fw-semibold">{item.mosque?.name || `Mosque #${item.mosque_id}`}</Link>
                      <span className="badge bg-light text-dark border">{labelOf(COMPLAINT_CATEGORIES, item.category)}</span>
                      {item.is_anonymous && <span className="badge bg-light text-dark border">Sent anonymously</span>}
                      <span className={`badge ms-auto ${COMPLAINT_STATUS[item.status]?.[1] || "bg-secondary"}`}>{COMPLAINT_STATUS[item.status]?.[0] || item.status}</span>
                    </div>
                    <p className="mb-1 mt-2 fw-semibold">{item.subject}</p>
                    <p className="mb-0 small text-muted" style={{ whiteSpace: "pre-line" }}>{item.body}</p>
                    {item.admin_response
                      ? <div className="mt-2 p-2 rounded bg-light small"><strong>Mosque's response</strong>{item.responded_at && <span className="text-muted"> · {item.responded_at.slice(0, 10)}</span>}<p className="mb-0" style={{ whiteSpace: "pre-line" }}>{item.admin_response}</p></div>
                      : <p className="mb-0 mt-2 small text-muted">No response yet. You'll be notified when the mosque replies.</p>}
                  </>}
                  {activeTab === "lostfound" && <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className={`badge ${item.type === "lost" ? "bg-danger" : "bg-success"} text-uppercase`}>{item.type}</span>
                    <Link to={`/community/lost-found/${item.id}`} className="fw-semibold me-auto">{item.title}</Link>
                    <span className={`badge ${LOST_FOUND_STATUS[item.status]?.[1] || "bg-secondary"}`}>{LOST_FOUND_STATUS[item.status]?.[0] || item.status}</span>
                  </div>}
                  {activeTab === "suggestions" && <>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <Link to={`/mosque/${item.mosque_id}`} className="fw-semibold">{item.mosque?.name || `Mosque #${item.mosque_id}`}</Link>
                      <span className="badge bg-light text-dark border">{item.field_label}</span>
                      <span className={`badge ms-auto ${SUGGESTION_STATUS[item.status]?.[1] || "bg-secondary"}`}>{item.auto_accepted ? "Accepted automatically" : SUGGESTION_STATUS[item.status]?.[0] || item.status}</span>
                    </div>
                    {item.field !== "other" && <p className="mb-0 mt-2 small">{describeValue(item.field, item.before)} → <strong>{describeValue(item.field, { ...(item.before || {}), ...item.payload, source: undefined })}</strong></p>}
                    {item.note && <p className="mb-0 mt-1 small text-muted">“{item.note}”</p>}
                    {item.review_note && <p className="mb-0 mt-1 small">Reviewer: {item.review_note}</p>}
                  </>}
                </div>)}
                {activeTab === "suggestions" && <p className="small text-muted">Spotted a wrong time or detail? Open the mosque's page and choose <strong>Suggest a correction</strong>. After 3 accepted corrections you get the <strong>Trusted contributor</strong> badge.</p>}
                {activeTab === "claims" && <p><Trans i18nKey="profile.claimsHelp" components={{ profile: <Link to="/mosque-admin/claim" /> }} /></p>}
                {/* [Urmee · F3 Part 3] Mosque suggestions are listed under Mosque Applications, with their status. */}
                {activeTab === "claims" && <MySuggestedMosques />}
                {activeTab === "feedback" && <p className="small text-muted">To send feedback, open a mosque's page and choose <strong>Send feedback to this mosque</strong>.</p>}
                {activeTab === "lostfound" && <p className="small text-muted"><Link to="/community?category=lost_found">Open Lost &amp; Found</Link> to report an item or mark one returned.</p>}
                {activeTab === "donations" && <GoodsPledges />}
                {activeTab === "donations" && <p className="small text-muted"><Trans i18nKey="profile.donationsHelp" components={{ campaigns: <Link to="/campaigns" /> }} /></p>}
              </>}
              {/* [Urmee · F6 Part 3] Each new tab is its own component with its own data and empty state. */}
              {activeTab === "volunteering" && <VolunteeringTab />}
              {activeTab === "blood-requests" && <MyBloodRequestsTab />}
              {activeTab === "blood-responses" && <MyBloodResponsesTab />}
              {activeTab === "settings" && <form onSubmit={saveProfile}>
                <div className="mb-3"><label className="form-label" htmlFor="profile-name">{t("profile.fullName")}</label><input id="profile-name" className="form-control" name="name" defaultValue={user.name} required maxLength={255} /></div>
                <div className="mb-3"><label className="form-label" htmlFor="profile-email">{t("profile.emailOptional")}</label><input id="profile-email" className="form-control" type="email" name="email" defaultValue={user.email || ""} maxLength={255} /></div>
                <div className="mb-4"><label className="form-label" htmlFor="profile-phone">{t("profile.verifiedPhone")}</label><input id="profile-phone" className="form-control" value={user.phone} readOnly /><p className="form-text">{t("profile.phoneHelp")}</p></div>
                <button className="btn btn-mc" disabled={saving}>{saving ? t("profile.saving") : t("profile.saveChanges")}</button>
              </form>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Goods pledges, listed under the Donations tab with the money pledges. */
function GoodsPledges() {
  const [pledges, setPledges] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/api/me/goods-donations", { signal: controller.signal })
      .then((data) => setPledges(data.data || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  if (!pledges.length) return null;
  return (
    <>
      <h3 className="h6 fw-bold mt-4">Goods pledges</h3>
      {pledges.map((pledge) => (
        <div className="border rounded p-3 mb-3" key={pledge.id}>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <strong className="me-auto">{pledge.quantity} × {pledge.item_name}</strong>
            <span className={`badge ${GOODS_STATUS[pledge.status]?.[1] || "bg-secondary"}`}>{GOODS_STATUS[pledge.status]?.[0] || pledge.status}</span>
          </div>
          <p className="mb-0 mt-1 small text-muted">{pledge.mosque?.name}</p>
        </div>
      ))}
    </>
  );
}
