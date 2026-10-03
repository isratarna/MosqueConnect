import { useEffect, useState } from "react";
import {
  Bot,
  Building2,
  Check,
  CircleAlert,
  Clock3,
  Download,
  Eye,
  FileWarning,
  Flag,
  GitMerge,
  Megaphone,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import {
  deleteManagedMosque,
  downloadAuditLogCsv,
  fetchAuditActions,
  fetchAuditLogs,
  fetchBroadcasts,
  fetchClaims,
  fetchManagedMosques,
  fetchManagedUsers,
  fetchModerationQueue,
  fetchReports,
  fetchSystemAdminOverview,
  fetchSystemSettings,
  fetchSystemStatistics,
  reviewClaim,
  sendBroadcast,
  updateContentModeration,
  updateManagedUser,
  updateMosqueVerification,
  updateReport,
  updateSystemSettings,
} from "../../utils/systemAdminApi";
import { useLocale } from "../../hooks/useLocale";
import { enumLabel, humanize as labelize, statusLabel } from "../../utils/labels";
import { aiScoreBadge, broadcastAudienceLabel, cleanFilters, describeContent, isSafeBroadcastLink } from "../../utils/adminConsole";
import ConfirmDialog from "../ConfirmDialog";

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

function AiScoreBadge({ claim }) {
  const badge = aiScoreBadge(claim.ai_score);
  if (badge) {
    const flags = claim.ai_result?.red_flags?.length || 0;
    return <div className="small mt-1"><span className={`badge bg-${badge.tone}-subtle text-${badge.tone}-emphasis border border-${badge.tone}-subtle`} title={claim.ai_result?.summary || ""}><Bot size={12} className="me-1" aria-hidden="true" />AI {badge.percent}%</span>{flags > 0 && <span className="text-danger ms-2"><TriangleAlert size={12} aria-hidden="true" /> {flags} flag{flags === 1 ? "" : "s"}</span>}</div>;
  }
  if (claim.ai_result?.error) return <div className="small text-muted mt-1">AI check failed</div>;
  return null;
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

const CLAIM_ACTIONS = {
  approve: (claim) => ({ title: `Approve ${claim.user?.name}'s claim?`, message: `${claim.user?.name} becomes the owner of ${claim.mosque?.name} and the mosque is marked verified.`, confirmLabel: "Approve claim", tone: "success", reason: "optional", reasonLabel: "Approval note" }),
  reject: (claim) => ({ title: "Reject this claim?", message: `${claim.user?.name}'s claim for ${claim.mosque?.name} will be rejected.`, confirmLabel: "Reject claim", tone: "danger", reason: "required", reasonLabel: "Rejection reason" }),
  "request-information": () => ({ title: "Ask for more information", message: "The claim stays open while the applicant responds.", confirmLabel: "Send request", reason: "required", reasonLabel: "What is needed" }),
};

export function ClaimsPanel() {
  const { t, locale } = useLocale();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const state = useRemoteData((signal) => fetchClaims({ status, search, page }, { signal }), [status, search, page]);

  const act = (claim, action) => setConfirm({
    ...CLAIM_ACTIONS[action](claim),
    onConfirm: async (note) => { await reviewClaim(claim.id, action, note); state.refresh(); },
  });

  return (
    <>
      <PanelHeader title={t("superAdmin.claims.title")} description={t("superAdmin.claims.description")} onRefresh={state.refresh}>
        <input className="form-control form-control-sm" style={{ width: 210 }} placeholder={t("superAdmin.claims.search")} aria-label={t("superAdmin.claims.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 175 }} aria-label={t("superAdmin.claims.status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{t("superAdmin.claims.allStatuses")}</option>{CLAIM_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(t, item)}</option>)}</select>
      </PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>{t("superAdmin.claims.applicant")}</th><th>{t("superAdmin.claims.mosque")}</th><th>{t("superAdmin.claims.proof")}</th><th>{t("superAdmin.claims.status")}</th><th>{t("superAdmin.claims.submitted")}</th><th className="text-end">{t("superAdmin.claims.actions")}</th></tr></thead>
          <tbody>{state.data?.data?.map((claim) => <tr key={claim.id}><td><strong>{claim.user?.name}</strong><div className="small text-muted">{claim.user?.phone}</div><div className="small text-muted">{t("superAdmin.claims.previousClaims", { count: Math.max(0, claim.applicant_claims_count - 1) })}</div></td><td><strong>{claim.mosque?.name}</strong><div className="small text-muted text-truncate" style={{ maxWidth: 220 }}>{claim.mosque?.address}</div>{claim.competing_claims_count > 0 && <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle mt-1">{claim.competing_claims_count} competing claim{claim.competing_claims_count === 1 ? "" : "s"}</span>}</td><td><button type="button" className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1" onClick={() => setReviewing(claim.id)}><Eye size={14} aria-hidden="true" />{t("superAdmin.claims.review")}</button><AiScoreBadge claim={claim} />{claim.review_note && <div className="small text-muted">Note: {claim.review_note}</div>}</td><td><StatusBadge value={claim.status} /></td><td className="small text-muted">{dateTime(claim.submitted_at)}</td><td><div className="d-flex justify-content-end gap-1">
            {!['approved', 'rejected'].includes(claim.status) && <><button className="btn btn-sm btn-outline-secondary" onClick={() => act(claim, "request-information")}>{t("superAdmin.claims.moreInfo")}</button><button className="btn btn-sm btn-outline-danger" onClick={() => act(claim, "reject")}><X size={14} /> {t("superAdmin.claims.reject")}</button><button className="btn btn-sm btn-success" onClick={() => act(claim, "approve")}><Check size={14} /> {t("superAdmin.claims.approve")}</button></>}
          </div></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
      {reviewing && <ClaimReviewPanel claimId={reviewing} onClose={() => setReviewing(null)} onChanged={state.refresh} />}
      {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
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
  const [confirm, setConfirm] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const state = useRemoteData((signal) => fetchManagedUsers({ role, account_status: accountStatus, search, page }, { signal }), [role, accountStatus, search, page]);

  const changeRole = (user, nextRole) => mutate(() => updateManagedUser(user.id, { role: nextRole }), { ...state, setBusy, key: user.id });
  const toggleStatus = (user) => {
    const suspending = user.account_status !== "suspended";
    setConfirm(suspending
      ? { title: `Suspend ${user.name}?`, message: "They are signed out everywhere and cannot sign in until reactivated.", confirmLabel: "Suspend account", tone: "danger", reason: "required", reasonLabel: "Suspension reason", onConfirm: async (reason) => { await updateManagedUser(user.id, { account_status: "suspended", suspension_reason: reason }); state.refresh(); } }
      : { title: `Reactivate ${user.name}?`, message: "They will be able to sign in again.", confirmLabel: "Reactivate", tone: "success", onConfirm: async () => { await updateManagedUser(user.id, { account_status: "active" }); state.refresh(); } });
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
          <tbody>{state.data?.data?.map((user) => <tr key={user.id}><td><strong>{user.name}</strong>{user.id === currentUser?.id && <span className="badge bg-primary ms-2">{t("superAdmin.users.you")}</span>}<div className="small text-muted">{user.phone}</div></td><td><select className="form-select form-select-sm" value={user.role} disabled={busy === user.id || user.id === currentUser?.id} onChange={(e) => changeRole(user, e.target.value)}>{ROLES.map((item) => <option key={item} value={item}>{enumLabel(t, "superAdmin.roles", ROLES, item)}</option>)}</select></td><td><StatusBadge value={user.account_status} />{user.suspension_reason && <div className="small text-danger mt-1">{user.suspension_reason}</div>}</td><td className="small"><div>{t("superAdmin.users.managed", { count: user.managed_mosques_count ?? user.owned_mosques_count })}</div><div>{t("superAdmin.users.followed", { count: user.followed_mosques_count })}</div></td><td className="text-end"><div className="d-flex justify-content-end gap-1"><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setDetailId(user.id)}>Details</button><button className={`btn btn-sm ${user.account_status === "suspended" ? "btn-outline-success" : "btn-outline-danger"}`} disabled={busy === user.id || user.id === currentUser?.id} onClick={() => toggleStatus(user)}>{user.account_status === "suspended" ? "Reactivate" : "Suspend"}</button></div></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
      {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
      {detailId && <UserDetailModal userId={detailId} onClose={() => setDetailId(null)} />}
    </>
  );
}

export function MosquesPanel() {
  const { t } = useLocale();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const [teamMosque, setTeamMosque] = useState(null);
  const [editing, setEditing] = useState(null);
  const [merging, setMerging] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [notice, setNotice] = useState("");
  const state = useRemoteData((signal) => fetchManagedMosques({ verification_status: status, search, page }, { signal }), [status, search, page]);

  const changeStatus = (mosque, nextStatus) => {
    if (nextStatus === "rejected") {
      setConfirm({ title: `Reject ${mosque.name}?`, message: "The mosque is marked as rejected.", confirmLabel: "Reject mosque", tone: "danger", reason: "required", reasonLabel: "Rejection reason", onConfirm: async (note) => { await updateMosqueVerification(mosque.id, nextStatus, note); state.refresh(); } });
      return;
    }
    mutate(() => updateMosqueVerification(mosque.id, nextStatus, ""), { ...state, setBusy, key: mosque.id });
  };

  const remove = (mosque, content = null) => setConfirm(content
    ? {
      title: `Force-delete ${mosque.name}?`,
      message: `This mosque still has ${describeContent(content)}. Force-deleting removes all of it permanently. Merging into another mosque keeps it instead.`,
      confirmLabel: "Delete everything",
      tone: "danger",
      onConfirm: async () => { await deleteManagedMosque(mosque.id, { force: true }); setNotice(`${mosque.name} was deleted.`); state.refresh(); },
    }
    : {
      title: `Delete ${mosque.name}?`,
      message: "Only mosques with no followers, content, claims or team can be deleted without force.",
      confirmLabel: "Delete mosque",
      tone: "danger",
      onConfirm: async () => {
        try {
          await deleteManagedMosque(mosque.id);
        } catch (error) {
          if (error.status === 409) {
            setTimeout(() => remove(mosque, error.payload?.content || {}), 0);
            return;
          }
          throw error;
        }
        setNotice(`${mosque.name} was deleted.`);
        state.refresh();
      },
    });

  return (
    <>
      <PanelHeader title={t("superAdmin.mosques.title")} description={t("superAdmin.mosques.description")} onRefresh={state.refresh}>
        <input className="form-control form-control-sm" style={{ width: 210 }} placeholder={t("superAdmin.mosques.search")} aria-label={t("superAdmin.mosques.search")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 165 }} aria-label={t("superAdmin.mosques.status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{t("superAdmin.mosques.allStatuses")}</option>{VERIFICATION_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(t, item)}</option>)}</select>
      </PanelHeader>
      {notice && <div className="alert alert-success d-flex justify-content-between align-items-center py-2" role="status"><span>{notice}</span><button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setNotice("")} /></div>}
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>{t("superAdmin.mosques.mosque")}</th><th>{t("superAdmin.mosques.owner")}</th><th>{t("superAdmin.mosques.status")}</th><th>{t("superAdmin.mosques.activity")}</th><th>{t("superAdmin.mosques.control")}</th><th className="text-end">{t("superAdmin.mosques.tools")}</th></tr></thead>
          <tbody>{state.data?.data?.map((mosque) => <tr key={mosque.id}><td><strong>{mosque.name}</strong> <span className="small text-muted">#{mosque.id}</span><div className="small text-muted text-truncate" style={{ maxWidth: 240 }}>{mosque.address}</div></td><td>{mosque.owner ? <><strong>{mosque.owner.name}</strong><div className="small text-muted">{mosque.owner.phone}</div></> : <span className="text-muted">Unassigned</span>}<div><button type="button" className="btn btn-link btn-sm p-0" onClick={() => setTeamMosque(mosque)}>Team ({mosque.team_count ?? 0}) · transfer / revoke</button></div></td><td><StatusBadge value={mosque.verification_status} /></td><td className="small">{mosque.followers_count} followers · {mosque.events_count} events · {mosque.campaigns_count} campaigns</td><td><select className="form-select form-select-sm" aria-label={`Verification status for ${mosque.name}`} value={mosque.verification_status} disabled={busy === mosque.id} onChange={(e) => changeStatus(mosque, e.target.value)}>{["unverified", "pending", "verified", "rejected"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></td><td><div className="d-flex justify-content-end gap-1">
            <button type="button" className="btn btn-sm btn-outline-secondary" title="Edit details" aria-label={`Edit ${mosque.name}`} onClick={() => setEditing(mosque)}><Pencil size={14} aria-hidden="true" /></button>
            <button type="button" className="btn btn-sm btn-outline-secondary" title="Merge into another mosque" aria-label={`Merge ${mosque.name} into another mosque`} onClick={() => setMerging(mosque)}><GitMerge size={14} aria-hidden="true" /></button>
            <button type="button" className="btn btn-sm btn-outline-danger" title="Delete" aria-label={`Delete ${mosque.name}`} onClick={() => remove(mosque)}><Trash2 size={14} aria-hidden="true" /></button>
          </div></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
      {teamMosque && <MosqueTeamModal mosque={teamMosque} onClose={() => setTeamMosque(null)} onChanged={state.refresh} />}
      {editing && <MosqueEditModal mosque={editing} onClose={() => setEditing(null)} onSaved={() => { setNotice(`${editing.name} was updated.`); state.refresh(); }} />}
      {merging && <MosqueMergeModal mosque={merging} onClose={() => setMerging(null)} onMerged={() => { setNotice(`${merging.name} was merged.`); state.refresh(); }} />}
      {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
    </>
  );
}

/** Suggested corrections. By default only mosques nobody manages; their own admins review the rest. */
export function CorrectionsPanel() {
  const [scope, setScope] = useState("unclaimed");
  const [search, setSearch] = useState("");

  return (
    <>
      <PanelHeader title="Suggested corrections" description="Fixes from visitors to mosques that have no admin team. Accepting one updates the mosque, and followers hear about time changes." />
      <div className="card border-0 shadow-sm"><div className="card-body">
        <SuggestionReviewList
          showMosque
          filterKey={`${scope}|${search}`}
          load={(query, options) => fetchSystemSuggestions({ ...query, scope, search }, options)}
          review={(suggestion, action, note) => reviewSystemSuggestion(suggestion.id, action, note)}
          emptyText="No corrections waiting for mosques without an admin."
          filters={(
            <>
              <label className="visually-hidden" htmlFor="corrections-scope">Mosques</label>
              <select id="corrections-scope" className="form-select form-select-sm" style={{ width: 230 }} value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="unclaimed">Mosques without an admin</option>
                <option value="all">All mosques</option>
              </select>
              <input className="form-control form-control-sm" style={{ width: 190 }} placeholder="Mosque name" aria-label="Search by mosque name" value={search} onChange={(e) => setSearch(e.target.value)} />
            </>
          )}
        />
      </div></div>
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
  const [confirm, setConfirm] = useState(null);
  const state = useRemoteData((signal) => fetchModerationQueue({ type, moderation_status: status, search, page }, { signal }), [type, status, search, page]);
  const moderationStatuses = type === "review" ? ["approved", "hidden"] : ["pending", "approved", "rejected"];
  const hiddenStatus = type === "review" ? "hidden" : "rejected";

  const moderate = (item, nextStatus) => {
    if (nextStatus === "rejected") {
      setConfirm({ title: `Hide “${item.title}”?`, message: "It disappears from the public site. The mosque admin sees your reason.", confirmLabel: "Hide content", tone: "danger", reason: "required", reasonLabel: "Moderation reason", onConfirm: async (note) => { await updateContentModeration(type, item.id, nextStatus, note); state.refresh(); } });
      return;
    }
    mutate(() => updateContentModeration(type, item.id, nextStatus, ""), { ...state, setBusy, key: item.id });
  };

  return (
    <>
      <PanelHeader title={t("superAdmin.moderation.title")} description={t("superAdmin.moderation.description")} onRefresh={state.refresh}>
        <input className="form-control form-control-sm" style={{ width: 180 }} placeholder={t("superAdmin.moderation.searchTitle")} aria-label={t("superAdmin.moderation.searchTitle")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 145 }} aria-label={t("superAdmin.moderation.moderation")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{t("superAdmin.moderation.allStatuses")}</option>{moderationStatuses.map((item) => <option key={item} value={item}>{statusLabel(t, item)}</option>)}</select>
      </PanelHeader>
      <div className="nav nav-pills gap-2 mb-3">{["announcement", "event", "campaign", "review"].map((item) => <button className={`nav-link ${type === item ? "active" : ""}`} key={item} onClick={() => { setType(item); setStatus(""); setPage(1); }}>{t(`superAdmin.moderation.types.${item}`)}</button>)}</div>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>{t("superAdmin.moderation.content")}</th><th>{t("superAdmin.moderation.mosque")}</th><th>{t("superAdmin.moderation.publication")}</th><th>{t("superAdmin.moderation.reports")}</th><th>{t("superAdmin.moderation.moderation")}</th><th className="text-end">{t("superAdmin.moderation.actions")}</th></tr></thead>
          <tbody>{state.data?.data?.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><div className="small text-muted text-truncate" style={{ maxWidth: 260 }}>{item.body || item.summary || item.description}</div></td><td>{item.mosque?.name}</td><td><StatusBadge value={item.status} /></td><td><span className={`badge ${item.reports_count ? "bg-danger" : "bg-secondary"}`}>{item.reports_count}</span></td><td><StatusBadge value={item.moderation_status} />{item.moderation_note && <div className="small text-danger mt-1">{item.moderation_note}</div>}</td><td><div className="d-flex justify-content-end gap-1"><button className="btn btn-sm btn-outline-danger" disabled={busy === item.id || item.moderation_status === hiddenStatus} onClick={() => moderate(item, hiddenStatus)}>Hide</button><button className="btn btn-sm btn-outline-success" disabled={busy === item.id || item.moderation_status === "approved"} onClick={() => moderate(item, "approved")}>Approve</button></div></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
      {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
    </>
  );
}

export function ReportsPanel() {
  const { t, locale } = useLocale();
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const state = useRemoteData((signal) => fetchReports({ status, type, page }, { signal }), [status, type, page]);

  const changeStatus = (report, nextStatus) => {
    if (["resolved", "dismissed"].includes(nextStatus)) {
      setConfirm({ title: `Mark report as ${nextStatus}?`, message: `${labelize(report.category)}: ${report.reason}`, confirmLabel: nextStatus === "resolved" ? "Resolve report" : "Dismiss report", tone: nextStatus === "resolved" ? "success" : "secondary", reason: "required", reasonLabel: "Resolution note", onConfirm: async (note) => { await updateReport(report.id, nextStatus, note); state.refresh(); } });
      return;
    }
    mutate(() => updateReport(report.id, nextStatus, ""), { ...state, setBusy, key: report.id });
  };

  return (
    <>
      <PanelHeader title={t("superAdmin.reports.title")} description={t("superAdmin.reports.description")} onRefresh={state.refresh}>
        <select className="form-select form-select-sm" style={{ width: 145 }} aria-label={t("superAdmin.reports.target")} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">{t("superAdmin.reports.allContent")}</option>{["announcement", "event", "campaign", "mosque", "review"].map((item) => <option key={item} value={item}>{t(`superAdmin.reports.targets.${item}`)}</option>)}</select>
        <select className="form-select form-select-sm" style={{ width: 145 }} aria-label={t("superAdmin.reports.status")} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">{t("superAdmin.reports.allStatuses")}</option>{REPORT_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(t, item)}</option>)}</select>
      </PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>{t("superAdmin.reports.report")}</th><th>{t("superAdmin.reports.target")}</th><th>{t("superAdmin.reports.reporter")}</th><th>{t("superAdmin.reports.status")}</th><th>{t("superAdmin.reports.submitted")}</th><th>{t("superAdmin.reports.resolution")}</th></tr></thead>
          <tbody>{state.data?.data?.map((report) => <tr key={report.id}><td><strong>{enumLabel(t, "superAdmin.reports.categories", REPORT_CATEGORIES, report.category)}</strong><div>{report.reason}</div>{report.details && <div className="small text-muted">{report.details}</div>}</td><td><span className="badge bg-light text-dark border me-1">{enumLabel(t, "superAdmin.reports.targets", REPORT_TARGETS, report.reportable_type)}</span>{report.target?.title || `#${report.reportable_id}`}</td><td>{report.reporter?.name || t("superAdmin.reports.deletedUser")}<div className="small text-muted">{report.reporter?.phone}</div></td><td><StatusBadge value={report.status} /></td><td className="small text-muted">{dateTime(report.created_at, locale)}</td><td><select className="form-select form-select-sm" aria-label={t("superAdmin.reports.resolution")} value={report.status} disabled={busy === report.id} onChange={(e) => changeStatus(report, e.target.value)}>{REPORT_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(t, item)}</option>)}</select>{report.resolution_note && <div className="small text-muted mt-1">{report.resolution_note}</div>}</td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
      {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
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
  const [filters, setFilters] = useState({ search: "", action: "", actor_id: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [actions, setActions] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const query = cleanFilters(filters);
  const state = useRemoteData((signal) => fetchAuditLogs({ ...query, page }, { signal }), [JSON.stringify(query), page]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAuditActions({ signal: controller.signal }).then(setActions).catch(() => {});
    return () => controller.abort();
  }, []);

  const setFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };

  const exportCsv = async () => {
    setExporting(true);
    setExportError("");
    try {
      await downloadAuditLogCsv(query);
    } catch (error) {
      setExportError(error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PanelHeader title={t("superAdmin.audit.title")} description={t("superAdmin.audit.description")} onRefresh={state.refresh}>
        <button type="button" className="btn btn-sm btn-outline-success d-flex align-items-center gap-1" disabled={exporting} onClick={exportCsv}><Download size={14} aria-hidden="true" />{exporting ? "Exporting…" : "Export CSV"}</button>
      </PanelHeader>
      <div className="card border-0 shadow-sm mb-3"><div className="card-body py-3 row g-2 align-items-end">
        <div className="col-md-3"><label className="form-label small mb-1" htmlFor="audit-search">Search</label><input id="audit-search" className="form-control form-control-sm" placeholder="Action or target" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} /></div>
        <div className="col-md-3"><label className="form-label small mb-1" htmlFor="audit-action">Action</label><select id="audit-action" className="form-select form-select-sm" value={filters.action} onChange={(e) => setFilter("action", e.target.value)}><option value="">All actions</option>{actions.map((action) => <option key={action} value={action}>{labelize(action.replaceAll(".", " "))}</option>)}</select></div>
        <div className="col-md-2"><label className="form-label small mb-1" htmlFor="audit-actor">Admin user ID</label><input id="audit-actor" type="number" min="1" className="form-control form-control-sm" value={filters.actor_id} onChange={(e) => setFilter("actor_id", e.target.value)} /></div>
        <div className="col-md-2"><label className="form-label small mb-1" htmlFor="audit-from">From</label><input id="audit-from" type="date" className="form-control form-control-sm" max={filters.to || undefined} value={filters.from} onChange={(e) => setFilter("from", e.target.value)} /></div>
        <div className="col-md-2"><label className="form-label small mb-1" htmlFor="audit-to">To</label><input id="audit-to" type="date" className="form-control form-control-sm" min={filters.from || undefined} value={filters.to} onChange={(e) => setFilter("to", e.target.value)} /></div>
      </div></div>
      {exportError && <div className="alert alert-danger py-2">{exportError}</div>}
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0"><thead className="table-light"><tr><th>{t("superAdmin.audit.time")}</th><th>{t("superAdmin.audit.administrator")}</th><th>{t("superAdmin.audit.action")}</th><th>{t("superAdmin.audit.target")}</th><th>{t("superAdmin.audit.details")}</th></tr></thead><tbody>{state.data?.data?.map((log) => <tr key={log.id}><td className="small text-muted text-nowrap">{dateTime(log.created_at)}</td><td>{log.actor?.name || "System"}<div className="small text-muted">{log.actor_id ? `ID ${log.actor_id} · ` : ""}{log.actor?.phone}</div></td><td><strong>{labelize(log.action.replaceAll(".", " "))}</strong></td><td>{log.target_type ? `${log.target_type} #${log.target_id || "—"}` : "—"}</td><td><code className="small text-wrap">{log.metadata ? JSON.stringify(log.metadata) : "—"}</code></td></tr>)}</tbody></table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

const EMPTY_BROADCAST = { title: "", message: "", audience: "all", audience_value: "", link: "" };

export function BroadcastPanel() {
  const [form, setForm] = useState(EMPTY_BROADCAST);
  const [page, setPage] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  const state = useRemoteData((signal) => fetchBroadcasts({ page }, { signal }), [page]);
  const linkOk = isSafeBroadcastLink(form.link.trim());
  const needsValue = form.audience !== "all";
  const ready = form.title.trim() && form.message.trim() && linkOk && (!needsValue || form.audience_value.trim());

  const payload = () => ({
    title: form.title.trim(),
    message: form.message.trim(),
    audience: form.audience,
    audience_value: needsValue ? form.audience_value.trim() : null,
    link: form.link.trim() || null,
  });

  return (
    <>
      <PanelHeader title="Broadcasts" description="Send an in-app notification to everyone, one role, or followers of mosques in a district." onRefresh={state.refresh} />
      {notice && <div className="alert alert-success d-flex justify-content-between align-items-center py-2" role="status"><span>{notice}</span><button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setNotice("")} /></div>}
      <form className="card border-0 shadow-sm mb-4" onSubmit={(event) => { event.preventDefault(); if (ready) setConfirming(true); }}>
        <div className="card-body row g-3">
          <div className="col-md-8"><label className="form-label fw-semibold" htmlFor="broadcast-title">Title <span className="text-danger">*</span></label><input id="broadcast-title" className="form-control" maxLength="120" required placeholder="Eid moon sighted" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="col-md-4"><label className="form-label fw-semibold" htmlFor="broadcast-audience">Audience</label><select id="broadcast-audience" className="form-select" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value, audience_value: e.target.value === "role" ? "normal_user" : "" })}><option value="all">Everyone</option><option value="role">One role</option><option value="district">A district</option></select></div>
          <div className="col-12"><label className="form-label fw-semibold" htmlFor="broadcast-message">Message <span className="text-danger">*</span></label><textarea id="broadcast-message" className="form-control" rows="3" maxLength="2000" required placeholder="Check your mosque's Eid jamaat times." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /><div className="form-text">{form.message.length}/2000</div></div>
          {form.audience === "role" && <div className="col-md-6"><label className="form-label fw-semibold" htmlFor="broadcast-role">Role</label><select id="broadcast-role" className="form-select" value={form.audience_value} onChange={(e) => setForm({ ...form, audience_value: e.target.value })}>{["normal_user", "mosque_admin", "super_admin"].map((role) => <option key={role} value={role}>{labelize(role)}</option>)}</select></div>}
          {form.audience === "district" && <div className="col-md-6"><label className="form-label fw-semibold" htmlFor="broadcast-district">District <span className="text-danger">*</span></label><input id="broadcast-district" className="form-control" placeholder="Dhaka" value={form.audience_value} onChange={(e) => setForm({ ...form, audience_value: e.target.value })} /><div className="form-text">Reaches people who follow at least one mosque in this district.</div></div>}
          <div className="col-md-6"><label className="form-label fw-semibold" htmlFor="broadcast-link">Link (optional)</label><input id="broadcast-link" className={`form-control ${linkOk ? "" : "is-invalid"}`} placeholder="/eid" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /><div className={linkOk ? "form-text" : "invalid-feedback"}>A page on this site (starting with /) or an https:// link.</div></div>
        </div>
        <div className="card-footer bg-white text-end py-3"><button className="btn btn-mc d-inline-flex align-items-center gap-2" disabled={!ready}><Megaphone size={16} aria-hidden="true" />Review and send</button></div>
      </form>

      <h5 className="fw-bold mb-3">Past broadcasts</h5>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>Sent</th><th>Message</th><th>Audience</th><th>Recipients</th><th>By</th></tr></thead>
          <tbody>{state.data?.data?.map((item) => <tr key={item.id}><td className="small text-muted text-nowrap">{dateTime(item.created_at)}</td><td><strong>{item.title}</strong><div className="small text-muted" style={{ maxWidth: 380 }}>{item.message}</div>{item.link && <div className="small"><code>{item.link}</code></div>}</td><td className="small">{broadcastAudienceLabel(item)}</td><td>{item.sent_at ? item.recipients_count : <span className="text-muted small">Sending…</span>}</td><td className="small">{item.sender?.name || "—"}</td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>

      {confirming && (
        <ConfirmDialog
          title="Send this broadcast?"
          confirmLabel="Send broadcast"
          message={`“${form.title.trim()}” goes to: ${broadcastAudienceLabel(payload())}. It cannot be unsent.`}
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            const response = await sendBroadcast(payload());
            setNotice(response.message || "Broadcast sent.");
            setForm(EMPTY_BROADCAST);
            setPage(1);
            state.refresh();
          }}
        />
      )}
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
      const updated = await updateSystemSettings({
        maintenance_notice: form.maintenance_notice,
        claims_enabled: form.claims_enabled,
        reports_enabled: form.reports_enabled,
        eid_season: form.eid_season ? { ...form.eid_season, show_from: form.eid_season.show_from || null } : null,
      });
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
          <div className="mb-4"><label className="form-label fw-semibold" htmlFor="maintenance-notice">Maintenance notice</label><textarea id="maintenance-notice" className="form-control" rows="3" maxLength="1000" value={form.maintenance_notice || ""} onChange={(e) => setForm({ ...form, maintenance_notice: e.target.value })} /><div className="form-text">Shown as a banner at the top of every page (visitors can dismiss it). Leave empty to hide it. Can take up to a minute to appear.</div></div>
          {[["claims_enabled", "Accept mosque claims"], ["reports_enabled", "Accept user reports"]].map(([key, label]) => <div className="form-check form-switch mb-3" key={key}><input className="form-check-input" type="checkbox" role="switch" id={key} checked={Boolean(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} /><label className="form-check-label fw-semibold" htmlFor={key}>{label}</label></div>)}
          <EidSeasonSettings value={form.eid_season} onChange={(eidSeason) => setForm({ ...form, eid_season: eidSeason })} />
        </div><div className="card-footer bg-white text-end py-3"><button className="btn btn-mc" disabled={saving}>{saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : "Save system settings"}</button></div></form>}
      </PanelState>
    </>
  );
}

function EidSeasonSettings({ value, onChange }) {
  const season = value || null;
  const update = (field, fieldValue) => onChange({ ...season, [field]: fieldValue });

  return (
    <fieldset className="border-top pt-4 mt-2">
      <legend className="fs-6 fw-semibold mb-1">Eid season</legend>
      <p className="form-text mt-0 mb-3">Opens the “Eid jamaat near me” page and the Home banner, and adds Eid jamaats to mosque profiles, from the show-from date until three days after Eid.</p>
      <div className="form-check form-switch mb-3">
        <input className="form-check-input" type="checkbox" role="switch" id="eid-season-enabled" checked={Boolean(season)} onChange={(e) => onChange(e.target.checked ? { eid: "fitr", expected_date: "", show_from: "" } : null)} />
        <label className="form-check-label fw-semibold" htmlFor="eid-season-enabled">Announce an upcoming Eid</label>
      </div>
      {season && <div className="row g-3">
        <div className="col-md-4"><label className="form-label" htmlFor="eid-season-eid">Eid</label><select id="eid-season-eid" className="form-select" value={season.eid} onChange={(e) => update("eid", e.target.value)}><option value="fitr">Eid-ul-Fitr</option><option value="adha">Eid-ul-Adha</option></select></div>
        <div className="col-md-4"><label className="form-label" htmlFor="eid-season-date">Expected date</label><input id="eid-season-date" type="date" className="form-control" required value={season.expected_date || ""} onChange={(e) => update("expected_date", e.target.value)} /></div>
        <div className="col-md-4"><label className="form-label" htmlFor="eid-season-show">Show from</label><input id="eid-season-show" type="date" className="form-control" max={season.expected_date || undefined} value={season.show_from || ""} onChange={(e) => update("show_from", e.target.value)} /><div className="form-text">Leave empty for two weeks before.</div></div>
      </div>}
    </fieldset>
  );
}

export function AccessError({ message }) {
  return <div className="alert alert-danger d-flex align-items-center gap-2"><CircleAlert size={18} />{message}</div>;
}
