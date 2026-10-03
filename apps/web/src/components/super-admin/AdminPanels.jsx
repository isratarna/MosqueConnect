import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  Check,
  CircleAlert,
  Clock3,
  FileWarning,
  Flag,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  fetchAuditLogs,
  fetchClaims,
  fetchManagedMosques,
  fetchManagedUsers,
  fetchModerationQueue,
  fetchReports,
  fetchSystemAdminOverview,
  fetchSystemSettings,
  fetchSystemStatistics,
  downloadClaimDocument,
  reviewClaim,
  updateContentModeration,
  updateManagedUser,
  updateMosqueVerification,
  updateReport,
  updateSystemSettings,
} from "../../utils/systemAdminApi";
import { useLocale } from "../../hooks/useLocale";
import { enumLabel, statusLabel } from "../../utils/labels";
import { formatDateTime, formatNumber } from "../../utils/intl";

// Value sets the panels translate. They mirror the backend enums.
const ROLES = ["normal_user", "mosque_admin", "super_admin"];
const CLAIM_STATUSES = ["pending", "ai_reviewed", "under_human_review", "approved", "rejected"];
const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "rejected"];
const MODERATION_STATUSES = ["pending", "approved", "rejected"];
const REPORT_STATUSES = ["pending", "reviewing", "resolved", "dismissed"];
const CONTENT_TYPES = ["announcement", "event", "campaign"];
const REPORT_TARGETS = ["announcement", "event", "campaign", "mosque"];
const REPORT_CATEGORIES = ["inaccurate", "inappropriate", "fraud", "safety", "spam", "other"];
const STAT_CONTENT = ["announcements", "events", "campaigns"];
const AUDIT_ACTIONS = [
  "claim_approved", "claim_information_requested", "claim_rejected", "content_moderated",
  "mosque_verification_updated", "report_updated", "settings_updated", "user_updated",
];

// What a mosque admin's edits record: "mosque_admin.<model>.<created|updated|deleted>".
const MOSQUE_ADMIN_ACTION = /^mosque_admin\.([a-z_]+)\.(created|updated|deleted)$/;
const AUDIT_MODELS = ["mosque", "prayer_time", "jumuah_session", "announcement", "event", "campaign", "campaign_donation", "volunteer_opportunity"];

// Audit actions arrive as "claim.approved"; their translation keys use "_".
function auditActionLabel(t, action = "") {
  const edit = MOSQUE_ADMIN_ACTION.exec(action);
  if (edit && AUDIT_MODELS.includes(edit[1])) {
    return t("superAdmin.actionTemplate", {
      model: t(`superAdmin.auditModels.${edit[1]}`),
      event: t(`superAdmin.auditEvents.${edit[2]}`),
    });
  }
  return enumLabel(t, "superAdmin.actions", AUDIT_ACTIONS, action.replaceAll(".", "_"));
}

const dateTime = (value, locale) => formatDateTime(value, locale) || "—";

function useRemoteData(loader, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    loader(controller.signal)
      .then(setData)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // dependencies are intentionally controlled by each panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reloadKey]);

  return { data, setData, loading, error, setError, refresh: () => setReloadKey((key) => key + 1) };
}

function PanelState({ loading, error, empty, onRetry, children }) {
  const { t } = useLocale();
  if (loading) return <div className="py-5 text-center text-muted"><span className="spinner-border spinner-border-sm me-2" />{t("superAdmin.loading")}</div>;
  if (error) return <div className="alert alert-danger d-flex justify-content-between align-items-center gap-3"><span>{error}</span><button className="btn btn-sm btn-outline-danger" onClick={onRetry}>{t("common.retry")}</button></div>;
  if (empty) return <div className="py-5 text-center text-muted">{t("superAdmin.empty")}</div>;
  return children;
}

function StatusBadge({ value }) {
  const { t } = useLocale();
  const tone = ["approved", "verified", "active", "resolved", "published"].includes(value)
    ? "success"
    : ["rejected", "suspended", "cancelled"].includes(value)
      ? "danger"
      : ["pending", "reviewing", "under_human_review", "ai_reviewed"].includes(value)
        ? "warning text-dark"
        : "secondary";
  return <span className={`badge bg-${tone}`}>{statusLabel(t, value)}</span>;
}

function PanelHeader({ title, description, onRefresh, children }) {
  const { t } = useLocale();
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div><h4 className="fw-bold mb-1">{title}</h4><p className="text-muted mb-0 small">{description}</p></div>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        {children}
        {onRefresh && <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={onRefresh}><RefreshCw size={14} />{t("superAdmin.refresh")}</button>}
      </div>
    </div>
  );
}

function Pager({ payload, onPage }) {
  const { t } = useLocale();
  if (!payload || payload.last_page <= 1) return null;
  return (
    <div className="d-flex justify-content-between align-items-center border-top px-3 py-2 small">
      <span className="text-muted">{t("superAdmin.pager", { page: payload.current_page, pages: payload.last_page, total: payload.total })}</span>
      <div className="btn-group btn-group-sm">
        <button className="btn btn-outline-secondary" disabled={payload.current_page <= 1} onClick={() => onPage(payload.current_page - 1)}>{t("common.previous")}</button>
        <button className="btn btn-outline-secondary" disabled={payload.current_page >= payload.last_page} onClick={() => onPage(payload.current_page + 1)}>{t("common.next")}</button>
      </div>
    </div>
  );
}

async function mutate(action, controls) {
  const { setBusy, setError, refresh, key } = controls;
  setBusy(key);
  setError("");
  try {
    await action();
    refresh();
  } catch (error) {
    setError(error.message);
  } finally {
    setBusy(null);
  }
}

export function OverviewPanel({ onNavigate }) {
  const { t, locale } = useLocale();
  const state = useRemoteData((signal) => fetchSystemAdminOverview({ signal }));
  const metrics = state.data ? [
    [t("superAdmin.overview.users"), state.data.users_count, Users, "primary", "users"],
    [t("superAdmin.overview.mosques"), state.data.mosques_count, Building2, "success", "mosques"],
    [t("superAdmin.overview.verified"), state.data.verified_mosques_count, ShieldCheck, "info", "mosques"],
    [t("superAdmin.overview.pendingClaims"), state.data.pending_claims_count, Clock3, "warning", "claims"],
    [t("superAdmin.overview.reports"), state.data.active_reports_count, Flag, "danger", "reports"],
    [t("superAdmin.overview.moderation"), state.data.pending_moderation_count, FileWarning, "secondary", "moderation"],
  ] : [];

  return (
    <>
      <PanelHeader title={t("superAdmin.overview.title")} description={t("superAdmin.overview.description")} onRefresh={state.refresh} />
      <PanelState loading={state.loading} error={state.error} onRetry={state.refresh}>
        <div className="row g-3 mb-4">
          {metrics.map(([label, value, Icon, color, section]) => (
            <div className="col-sm-6 col-xl-4" key={section + label}>
              <button type="button" className="card border-0 shadow-sm p-3 w-100 text-start h-100" onClick={() => onNavigate(section)}>
                <div className="d-flex justify-content-between align-items-center">
                  <div><div className="text-muted small mb-1">{label}</div><div className="fs-3 fw-bold">{formatNumber(Number(value), locale)}</div></div>
                  <span className={`rounded-circle bg-${color}-subtle text-${color} p-3`}><Icon size={24} /></span>
                </div>
              </button>
            </div>
          ))}
        </div>
        <div className="row g-3">
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm h-100"><div className="card-body">
              <h6 className="fw-bold">{t("superAdmin.overview.breakdown")}</h6>
              {Object.entries(state.data?.users_by_role || {}).map(([role, count]) => <div className="d-flex justify-content-between border-bottom py-2" key={role}><span>{enumLabel(t, "superAdmin.roles", ROLES, role)}</span><strong>{formatNumber(count, locale)}</strong></div>)}
            </div></div>
          </div>
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm h-100"><div className="card-body">
              <h6 className="fw-bold">{t("superAdmin.overview.recent")}</h6>
              {(state.data?.recent_activity || []).length === 0 && <p className="text-muted small mb-0">{t("superAdmin.overview.none")}</p>}
              {(state.data?.recent_activity || []).map((log) => <div className="d-flex justify-content-between gap-3 border-bottom py-2 small" key={log.id}><span><strong>{log.actor?.name || t("superAdmin.system")}</strong> · {auditActionLabel(t, log.action)}</span><span className="text-muted text-nowrap">{dateTime(log.created_at, locale)}</span></div>)}
            </div></div>
          </div>
        </div>
      </PanelState>
    </>
  );
}

export function ClaimsPanel() {
  const { t, locale } = useLocale();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const state = useRemoteData((signal) => fetchClaims({ status, search, page }, { signal }), [status, search, page]);

  const act = (claim, action) => {
    const prompts = {
      approve: t("superAdmin.claims.promptApprove"),
      reject: t("superAdmin.claims.promptReject"),
      "request-information": t("superAdmin.claims.promptInfo"),
    };
    const note = window.prompt(prompts[action], "");
    if (note === null || (action !== "approve" && !note.trim())) return;
    mutate(() => reviewClaim(claim.id, action, note), { ...state, setBusy, key: `${claim.id}-${action}` });
  };

  const downloadProof = (claim) => mutate(
    () => downloadClaimDocument(claim.id),
    { ...state, setBusy, key: `${claim.id}-document` },
  );

  return (
    <>
      <PanelHeader title={t("superAdmin.claims.title")} description={t("superAdmin.claims.description")} onRefresh={state.refresh}>
        <input className="form-control form-control-sm" style={{ width: 210 }} placeholder={t("superAdmin.claims.search")} aria-label={t("superAdmin.claims.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 175 }} aria-label={t("superAdmin.claims.status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{t("superAdmin.claims.allStatuses")}</option>{CLAIM_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(t, item)}</option>)}</select>
      </PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>{t("superAdmin.claims.applicant")}</th><th>{t("superAdmin.claims.mosque")}</th><th>{t("superAdmin.claims.proof")}</th><th>{t("superAdmin.claims.status")}</th><th>{t("superAdmin.claims.submitted")}</th><th className="text-end">{t("superAdmin.claims.actions")}</th></tr></thead>
          <tbody>{state.data?.data?.map((claim) => <tr key={claim.id}><td><strong>{claim.user?.name}</strong><div className="small text-muted">{claim.user?.phone}</div><div className="small text-muted">{t("superAdmin.claims.previousClaims", { count: Math.max(0, claim.applicant_claims_count - 1) })}</div></td><td><strong>{claim.mosque?.name}</strong><div className="small text-muted text-truncate" style={{ maxWidth: 220 }}>{claim.mosque?.address}</div></td><td><button className="btn btn-sm btn-link px-0" disabled={busy} onClick={() => downloadProof(claim)}>{t("superAdmin.claims.download")}</button>{claim.ai_score && <div className="small text-muted">{t("superAdmin.claims.aiScore", { score: claim.ai_score })}</div>}{claim.review_note && <div className="small text-muted">{t("superAdmin.claims.note", { note: claim.review_note })}</div>}</td><td><StatusBadge value={claim.status} /></td><td className="small text-muted">{dateTime(claim.submitted_at, locale)}</td><td><div className="d-flex justify-content-end gap-1">
            {!['approved', 'rejected'].includes(claim.status) && <><button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => act(claim, "request-information")}>{t("superAdmin.claims.moreInfo")}</button><button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => act(claim, "reject")}><X size={14} /> {t("superAdmin.claims.reject")}</button><button className="btn btn-sm btn-success" disabled={busy} onClick={() => act(claim, "approve")}><Check size={14} /> {t("superAdmin.claims.approve")}</button></>}
          </div></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function UsersPanel({ currentUser }) {
  const { t } = useLocale();
  const [role, setRole] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const state = useRemoteData((signal) => fetchManagedUsers({ role, account_status: accountStatus, search, page }, { signal }), [role, accountStatus, search, page]);

  const changeRole = (user, nextRole) => mutate(() => updateManagedUser(user.id, { role: nextRole }), { ...state, setBusy, key: user.id });
  const toggleStatus = (user) => {
    const suspending = user.account_status !== "suspended";
    const reason = suspending ? window.prompt(t("superAdmin.users.promptSuspend"), "") : "";
    if (suspending && !reason?.trim()) return;
    mutate(() => updateManagedUser(user.id, { account_status: suspending ? "suspended" : "active", suspension_reason: reason }), { ...state, setBusy, key: user.id });
  };

  return (
    <>
      <PanelHeader title={t("superAdmin.users.title")} description={t("superAdmin.users.description")} onRefresh={state.refresh}>
        <input className="form-control form-control-sm" style={{ width: 190 }} placeholder={t("superAdmin.users.search")} aria-label={t("superAdmin.users.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 145 }} aria-label={t("superAdmin.users.role")} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">{t("superAdmin.users.allRoles")}</option>{ROLES.map((item) => <option key={item} value={item}>{enumLabel(t, "superAdmin.roles", ROLES, item)}</option>)}</select>
        <select className="form-select form-select-sm" style={{ width: 135 }} aria-label={t("superAdmin.users.status")} value={accountStatus} onChange={(e) => { setAccountStatus(e.target.value); setPage(1); }}><option value="">{t("superAdmin.users.allAccounts")}</option><option value="active">{t("superAdmin.users.active")}</option><option value="suspended">{t("superAdmin.users.suspended")}</option></select>
      </PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>{t("superAdmin.users.user")}</th><th>{t("superAdmin.users.role")}</th><th>{t("superAdmin.users.status")}</th><th>{t("superAdmin.users.activity")}</th><th className="text-end">{t("superAdmin.users.control")}</th></tr></thead>
          <tbody>{state.data?.data?.map((user) => <tr key={user.id}><td><strong>{user.name}</strong>{user.id === currentUser?.id && <span className="badge bg-primary ms-2">{t("superAdmin.users.you")}</span>}<div className="small text-muted">{user.phone}</div></td><td><select className="form-select form-select-sm" aria-label={t("superAdmin.users.role")} value={user.role} disabled={busy === user.id || user.id === currentUser?.id} onChange={(e) => changeRole(user, e.target.value)}>{ROLES.map((item) => <option key={item} value={item}>{enumLabel(t, "superAdmin.roles", ROLES, item)}</option>)}</select></td><td><StatusBadge value={user.account_status} />{user.suspension_reason && <div className="small text-danger mt-1">{user.suspension_reason}</div>}</td><td className="small"><div>{t("superAdmin.users.managed", { count: user.owned_mosques_count })}</div><div>{t("superAdmin.users.followed", { count: user.followed_mosques_count })}</div></td><td className="text-end"><button className={`btn btn-sm ${user.account_status === "suspended" ? "btn-outline-success" : "btn-outline-danger"}`} disabled={busy === user.id || user.id === currentUser?.id} onClick={() => toggleStatus(user)}>{user.account_status === "suspended" ? t("superAdmin.users.reactivate") : t("superAdmin.users.suspend")}</button></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function MosquesPanel() {
  const { t } = useLocale();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const state = useRemoteData((signal) => fetchManagedMosques({ verification_status: status, search, page }, { signal }), [status, search, page]);

  const changeStatus = (mosque, nextStatus) => {
    const note = nextStatus === "rejected" ? window.prompt(t("superAdmin.mosques.promptReject"), "") : "";
    if (nextStatus === "rejected" && !note?.trim()) return;
    mutate(() => updateMosqueVerification(mosque.id, nextStatus, note), { ...state, setBusy, key: mosque.id });
  };

  return (
    <>
      <PanelHeader title={t("superAdmin.mosques.title")} description={t("superAdmin.mosques.description")} onRefresh={state.refresh}>
        <input className="form-control form-control-sm" style={{ width: 210 }} placeholder={t("superAdmin.mosques.search")} aria-label={t("superAdmin.mosques.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 165 }} aria-label={t("superAdmin.mosques.status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{t("superAdmin.mosques.allStatuses")}</option>{VERIFICATION_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(t, item)}</option>)}</select>
      </PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>{t("superAdmin.mosques.mosque")}</th><th>{t("superAdmin.mosques.owner")}</th><th>{t("superAdmin.mosques.status")}</th><th>{t("superAdmin.mosques.activity")}</th><th>{t("superAdmin.mosques.control")}</th></tr></thead>
          <tbody>{state.data?.data?.map((mosque) => <tr key={mosque.id}><td><strong>{mosque.name}</strong><div className="small text-muted text-truncate" style={{ maxWidth: 240 }}>{mosque.address}</div></td><td>{mosque.owner ? <><strong>{mosque.owner.name}</strong><div className="small text-muted">{mosque.owner.phone}</div></> : <span className="text-muted">{t("superAdmin.mosques.unassigned")}</span>}</td><td><StatusBadge value={mosque.verification_status} /></td><td className="small">{t("superAdmin.mosques.stats", { followers: mosque.followers_count, events: mosque.events_count, campaigns: mosque.campaigns_count })}</td><td><select className="form-select form-select-sm" aria-label={t("superAdmin.mosques.control")} value={mosque.verification_status} disabled={busy === mosque.id} onChange={(e) => changeStatus(mosque, e.target.value)}>{VERIFICATION_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(t, item)}</option>)}</select></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function ModerationPanel() {
  const { t } = useLocale();
  const [type, setType] = useState("announcement");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const state = useRemoteData((signal) => fetchModerationQueue({ type, moderation_status: status, search, page }, { signal }), [type, status, search, page]);

  const moderate = (item, nextStatus) => {
    const note = nextStatus === "rejected" ? window.prompt(t("superAdmin.moderation.prompt"), "") : "";
    if (nextStatus === "rejected" && !note?.trim()) return;
    mutate(() => updateContentModeration(type, item.id, nextStatus, note), { ...state, setBusy, key: item.id });
  };

  return (
    <>
      <PanelHeader title={t("superAdmin.moderation.title")} description={t("superAdmin.moderation.description")} onRefresh={state.refresh}>
        <input className="form-control form-control-sm" style={{ width: 180 }} placeholder={t("superAdmin.moderation.searchTitle")} aria-label={t("superAdmin.moderation.searchTitle")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 145 }} aria-label={t("superAdmin.moderation.moderation")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{t("superAdmin.moderation.allStatuses")}</option>{MODERATION_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(t, item)}</option>)}</select>
      </PanelHeader>
      <div className="nav nav-pills gap-2 mb-3">{CONTENT_TYPES.map((item) => <button className={`nav-link ${type === item ? "active" : ""}`} key={item} onClick={() => { setType(item); setPage(1); }}>{t(`superAdmin.moderation.types.${item}`)}</button>)}</div>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>{t("superAdmin.moderation.content")}</th><th>{t("superAdmin.moderation.mosque")}</th><th>{t("superAdmin.moderation.publication")}</th><th>{t("superAdmin.moderation.reports")}</th><th>{t("superAdmin.moderation.moderation")}</th><th className="text-end">{t("superAdmin.moderation.actions")}</th></tr></thead>
          <tbody>{state.data?.data?.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><div className="small text-muted text-truncate" style={{ maxWidth: 260 }}>{item.body || item.summary || item.description}</div></td><td>{item.mosque?.name}</td><td><StatusBadge value={item.status} /></td><td><span className={`badge ${item.reports_count ? "bg-danger" : "bg-secondary"}`}>{item.reports_count}</span></td><td><StatusBadge value={item.moderation_status} />{item.moderation_note && <div className="small text-danger mt-1">{item.moderation_note}</div>}</td><td><div className="d-flex justify-content-end gap-1"><button className="btn btn-sm btn-outline-danger" disabled={busy === item.id || item.moderation_status === "rejected"} onClick={() => moderate(item, "rejected")}>{t("superAdmin.moderation.hide")}</button><button className="btn btn-sm btn-outline-success" disabled={busy === item.id || item.moderation_status === "approved"} onClick={() => moderate(item, "approved")}>{t("superAdmin.moderation.approve")}</button></div></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function ReportsPanel() {
  const { t, locale } = useLocale();
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const state = useRemoteData((signal) => fetchReports({ status, type, page }, { signal }), [status, type, page]);

  const changeStatus = (report, nextStatus) => {
    const final = ["resolved", "dismissed"].includes(nextStatus);
    const note = final ? window.prompt(t("superAdmin.reports.prompt"), "") : "";
    if (final && !note?.trim()) return;
    mutate(() => updateReport(report.id, nextStatus, note), { ...state, setBusy, key: report.id });
  };

  return (
    <>
      <PanelHeader title={t("superAdmin.reports.title")} description={t("superAdmin.reports.description")} onRefresh={state.refresh}>
        <select className="form-select form-select-sm" style={{ width: 145 }} aria-label={t("superAdmin.reports.target")} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">{t("superAdmin.reports.allContent")}</option>{REPORT_TARGETS.map((item) => <option key={item} value={item}>{t(`superAdmin.reports.targets.${item}`)}</option>)}</select>
        <select className="form-select form-select-sm" style={{ width: 145 }} aria-label={t("superAdmin.reports.status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{t("superAdmin.reports.allStatuses")}</option>{REPORT_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(t, item)}</option>)}</select>
      </PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>{t("superAdmin.reports.report")}</th><th>{t("superAdmin.reports.target")}</th><th>{t("superAdmin.reports.reporter")}</th><th>{t("superAdmin.reports.status")}</th><th>{t("superAdmin.reports.submitted")}</th><th>{t("superAdmin.reports.resolution")}</th></tr></thead>
          <tbody>{state.data?.data?.map((report) => <tr key={report.id}><td><strong>{enumLabel(t, "superAdmin.reports.categories", REPORT_CATEGORIES, report.category)}</strong><div>{report.reason}</div>{report.details && <div className="small text-muted">{report.details}</div>}</td><td><span className="badge bg-light text-dark border me-1">{enumLabel(t, "superAdmin.reports.targets", REPORT_TARGETS, report.reportable_type)}</span>{report.target?.title || `#${report.reportable_id}`}</td><td>{report.reporter?.name || t("superAdmin.reports.deletedUser")}<div className="small text-muted">{report.reporter?.phone}</div></td><td><StatusBadge value={report.status} /></td><td className="small text-muted">{dateTime(report.created_at, locale)}</td><td><select className="form-select form-select-sm" aria-label={t("superAdmin.reports.resolution")} value={report.status} disabled={busy === report.id} onChange={(e) => changeStatus(report, e.target.value)}>{REPORT_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(t, item)}</option>)}</select>{report.resolution_note && <div className="small text-muted mt-1">{report.resolution_note}</div>}</td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function StatisticsPanel() {
  const { t, locale } = useLocale();
  const state = useRemoteData((signal) => fetchSystemStatistics({ signal }));
  return (
    <>
      <PanelHeader title={t("superAdmin.statistics.title")} description={t("superAdmin.statistics.description")} onRefresh={state.refresh} />
      <PanelState loading={state.loading} error={state.error} onRetry={state.refresh}>
        <div className="row g-3 mb-4">{Object.entries(state.data?.content || {}).map(([label, count]) => <div className="col-md-4" key={label}><div className="card border-0 shadow-sm p-4"><div className="text-muted small">{enumLabel(t, "superAdmin.statistics.content", STAT_CONTENT, label)}</div><div className="fs-2 fw-bold">{formatNumber(count, locale)}</div></div></div>)}</div>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table mb-0"><thead className="table-light"><tr><th>{t("superAdmin.statistics.month")}</th><th>{t("superAdmin.statistics.newUsers")}</th><th>{t("superAdmin.statistics.newMosques")}</th><th>{t("superAdmin.statistics.claims")}</th><th>{t("superAdmin.statistics.reports")}</th></tr></thead><tbody>{state.data?.monthly?.map((month) => <tr key={month.key}><th>{month.label}</th><td>{formatNumber(month.users, locale)}</td><td>{formatNumber(month.mosques, locale)}</td><td>{formatNumber(month.claims, locale)}</td><td>{formatNumber(month.reports, locale)}</td></tr>)}</tbody></table></div></div>
      </PanelState>
    </>
  );
}

export function AuditPanel() {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const state = useRemoteData((signal) => fetchAuditLogs({ search, page }, { signal }), [search, page]);
  return (
    <>
      <PanelHeader title={t("superAdmin.audit.title")} description={t("superAdmin.audit.description")} onRefresh={state.refresh}><input className="form-control form-control-sm" style={{ width: 210 }} placeholder={t("superAdmin.audit.search")} aria-label={t("superAdmin.audit.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0"><thead className="table-light"><tr><th>{t("superAdmin.audit.time")}</th><th>{t("superAdmin.audit.administrator")}</th><th>{t("superAdmin.audit.action")}</th><th>{t("superAdmin.audit.target")}</th><th>{t("superAdmin.audit.details")}</th></tr></thead><tbody>{state.data?.data?.map((log) => <tr key={log.id}><td className="small text-muted text-nowrap">{dateTime(log.created_at, locale)}</td><td>{log.actor?.name || t("superAdmin.system")}<div className="small text-muted">{log.actor?.phone}</div></td><td><strong>{auditActionLabel(t, log.action)}</strong></td><td>{log.target_type ? `${log.target_type} #${log.target_id || "—"}` : "—"}</td><td><code className="small text-wrap">{log.metadata ? JSON.stringify(log.metadata) : "—"}</code></td></tr>)}</tbody></table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function SettingsPanel() {
  const { t } = useLocale();
  const state = useRemoteData((signal) => fetchSystemSettings({ signal }));
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (state.data) setForm(state.data); }, [state.data]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    state.setError("");
    try {
      const updated = await updateSystemSettings(form);
      setForm(updated);
      state.setData(updated);
    } catch (error) {
      state.setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PanelHeader title={t("superAdmin.settings.title")} description={t("superAdmin.settings.description")} onRefresh={state.refresh} />
      <PanelState loading={state.loading} error={state.error} onRetry={state.refresh}>
        {form && <form className="card border-0 shadow-sm" onSubmit={save}><div className="card-body p-4">
          <div className="mb-4"><label className="form-label fw-semibold" htmlFor="maintenance-notice">{t("superAdmin.settings.maintenance")}</label><textarea id="maintenance-notice" className="form-control" rows="3" maxLength="1000" value={form.maintenance_notice || ""} onChange={(e) => setForm({ ...form, maintenance_notice: e.target.value })} /><div className="form-text">{t("superAdmin.settings.maintenanceHelp")}</div></div>
          {["claims_enabled", "reports_enabled", "auto_publish_verified_mosques"].map((key) => <div className="form-check form-switch mb-3" key={key}><input className="form-check-input" type="checkbox" role="switch" id={key} checked={Boolean(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} /><label className="form-check-label fw-semibold" htmlFor={key}>{t(`superAdmin.settings.${key}`)}</label></div>)}
        </div><div className="card-footer bg-white text-end py-3"><button className="btn btn-mc" disabled={saving}>{saving ? <><span className="spinner-border spinner-border-sm me-2" />{t("superAdmin.settings.saving")}</> : t("superAdmin.settings.save")}</button></div></form>}
      </PanelState>
    </>
  );
}

export function AccessError({ message }) {
  return <div className="alert alert-danger d-flex align-items-center gap-2"><CircleAlert size={18} />{message}</div>;
}
