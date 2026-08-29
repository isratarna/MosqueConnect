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

const dateTime = (value) => value ? new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value)) : "—";

const labelize = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

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
  if (loading) return <div className="py-5 text-center text-muted"><span className="spinner-border spinner-border-sm me-2" />Loading administration data…</div>;
  if (error) return <div className="alert alert-danger d-flex justify-content-between align-items-center gap-3"><span>{error}</span><button className="btn btn-sm btn-outline-danger" onClick={onRetry}>Retry</button></div>;
  if (empty) return <div className="py-5 text-center text-muted">No matching records were found.</div>;
  return children;
}

function StatusBadge({ value }) {
  const tone = ["approved", "verified", "active", "resolved", "published"].includes(value)
    ? "success"
    : ["rejected", "suspended", "cancelled"].includes(value)
      ? "danger"
      : ["pending", "reviewing", "under_human_review", "ai_reviewed"].includes(value)
        ? "warning text-dark"
        : "secondary";
  return <span className={`badge bg-${tone}`}>{labelize(value)}</span>;
}

function PanelHeader({ title, description, onRefresh, children }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div><h4 className="fw-bold mb-1">{title}</h4><p className="text-muted mb-0 small">{description}</p></div>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        {children}
        {onRefresh && <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={onRefresh}><RefreshCw size={14} />Refresh</button>}
      </div>
    </div>
  );
}

function Pager({ payload, onPage }) {
  if (!payload || payload.last_page <= 1) return null;
  return (
    <div className="d-flex justify-content-between align-items-center border-top px-3 py-2 small">
      <span className="text-muted">Page {payload.current_page} of {payload.last_page} · {payload.total} records</span>
      <div className="btn-group btn-group-sm">
        <button className="btn btn-outline-secondary" disabled={payload.current_page <= 1} onClick={() => onPage(payload.current_page - 1)}>Previous</button>
        <button className="btn btn-outline-secondary" disabled={payload.current_page >= payload.last_page} onClick={() => onPage(payload.current_page + 1)}>Next</button>
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
  const state = useRemoteData((signal) => fetchSystemAdminOverview({ signal }));
  const metrics = state.data ? [
    ["Total users", state.data.users_count, Users, "primary", "users"],
    ["Registered mosques", state.data.mosques_count, Building2, "success", "mosques"],
    ["Verified mosques", state.data.verified_mosques_count, ShieldCheck, "info", "mosques"],
    ["Pending claims", state.data.pending_claims_count, Clock3, "warning", "claims"],
    ["Active reports", state.data.active_reports_count, Flag, "danger", "reports"],
    ["Pending moderation", state.data.pending_moderation_count, FileWarning, "secondary", "moderation"],
  ] : [];

  return (
    <>
      <PanelHeader title="Platform overview" description="Live system health and work requiring attention." onRefresh={state.refresh} />
      <PanelState loading={state.loading} error={state.error} onRetry={state.refresh}>
        <div className="row g-3 mb-4">
          {metrics.map(([label, value, Icon, color, section]) => (
            <div className="col-sm-6 col-xl-4" key={label}>
              <button type="button" className="card border-0 shadow-sm p-3 w-100 text-start h-100" onClick={() => onNavigate(section)}>
                <div className="d-flex justify-content-between align-items-center">
                  <div><div className="text-muted small mb-1">{label}</div><div className="fs-3 fw-bold">{Number(value).toLocaleString()}</div></div>
                  <span className={`rounded-circle bg-${color}-subtle text-${color} p-3`}><Icon size={24} /></span>
                </div>
              </button>
            </div>
          ))}
        </div>
        <div className="row g-3">
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm h-100"><div className="card-body">
              <h6 className="fw-bold">Account breakdown</h6>
              {Object.entries(state.data?.users_by_role || {}).map(([role, count]) => <div className="d-flex justify-content-between border-bottom py-2" key={role}><span>{labelize(role)}</span><strong>{count}</strong></div>)}
            </div></div>
          </div>
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm h-100"><div className="card-body">
              <h6 className="fw-bold">Recent administrative activity</h6>
              {(state.data?.recent_activity || []).length === 0 && <p className="text-muted small mb-0">No administrative actions recorded yet.</p>}
              {(state.data?.recent_activity || []).map((log) => <div className="d-flex justify-content-between gap-3 border-bottom py-2 small" key={log.id}><span><strong>{log.actor?.name || "System"}</strong> · {labelize(log.action.replaceAll(".", " "))}</span><span className="text-muted text-nowrap">{dateTime(log.created_at)}</span></div>)}
            </div></div>
          </div>
        </div>
      </PanelState>
    </>
  );
}

export function ClaimsPanel() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const state = useRemoteData((signal) => fetchClaims({ status, search, page }, { signal }), [status, search, page]);

  const act = (claim, action) => {
    const prompts = {
      approve: "Optional approval note:",
      reject: "Rejection reason (required):",
      "request-information": "Describe the additional information required:",
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
      <PanelHeader title="Mosque claims" description="Review applicant proof and control mosque verification." onRefresh={state.refresh}>
        <input className="form-control form-control-sm" style={{ width: 210 }} placeholder="Search applicant or mosque" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 175 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{["pending", "ai_reviewed", "under_human_review", "approved", "rejected"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select>
      </PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>Applicant</th><th>Mosque</th><th>Proof</th><th>Status</th><th>Submitted</th><th className="text-end">Actions</th></tr></thead>
          <tbody>{state.data?.data?.map((claim) => <tr key={claim.id}><td><strong>{claim.user?.name}</strong><div className="small text-muted">{claim.user?.phone}</div><div className="small text-muted">{Math.max(0, claim.applicant_claims_count - 1)} previous claim(s)</div></td><td><strong>{claim.mosque?.name}</strong><div className="small text-muted text-truncate" style={{ maxWidth: 220 }}>{claim.mosque?.address}</div></td><td><button className="btn btn-sm btn-link px-0" disabled={busy} onClick={() => downloadProof(claim)}>Download proof</button>{claim.ai_score && <div className="small text-muted">AI score: {claim.ai_score}</div>}{claim.review_note && <div className="small text-muted">Note: {claim.review_note}</div>}</td><td><StatusBadge value={claim.status} /></td><td className="small text-muted">{dateTime(claim.submitted_at)}</td><td><div className="d-flex justify-content-end gap-1">
            {!['approved', 'rejected'].includes(claim.status) && <><button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => act(claim, "request-information")}>More info</button><button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => act(claim, "reject")}><X size={14} /> Reject</button><button className="btn btn-sm btn-success" disabled={busy} onClick={() => act(claim, "approve")}><Check size={14} /> Approve</button></>}
          </div></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function UsersPanel({ currentUser }) {
  const [role, setRole] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const state = useRemoteData((signal) => fetchManagedUsers({ role, account_status: accountStatus, search, page }, { signal }), [role, accountStatus, search, page]);

  const changeRole = (user, nextRole) => mutate(() => updateManagedUser(user.id, { role: nextRole }), { ...state, setBusy, key: user.id });
  const toggleStatus = (user) => {
    const suspending = user.account_status !== "suspended";
    const reason = suspending ? window.prompt("Suspension reason (required):", "") : "";
    if (suspending && !reason?.trim()) return;
    mutate(() => updateManagedUser(user.id, { account_status: suspending ? "suspended" : "active", suspension_reason: reason }), { ...state, setBusy, key: user.id });
  };

  return (
    <>
      <PanelHeader title="User management" description="Search accounts, assign roles, and suspend abusive users." onRefresh={state.refresh}>
        <input className="form-control form-control-sm" style={{ width: 190 }} placeholder="Name or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 145 }} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All roles</option>{["normal_user", "mosque_admin", "super_admin"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select>
        <select className="form-select form-select-sm" style={{ width: 135 }} value={accountStatus} onChange={(e) => { setAccountStatus(e.target.value); setPage(1); }}><option value="">All accounts</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
      </PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>User</th><th>Role</th><th>Status</th><th>Activity</th><th className="text-end">Account control</th></tr></thead>
          <tbody>{state.data?.data?.map((user) => <tr key={user.id}><td><strong>{user.name}</strong>{user.id === currentUser?.id && <span className="badge bg-primary ms-2">You</span>}<div className="small text-muted">{user.phone}</div></td><td><select className="form-select form-select-sm" value={user.role} disabled={busy === user.id || user.id === currentUser?.id} onChange={(e) => changeRole(user, e.target.value)}>{["normal_user", "mosque_admin", "super_admin"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></td><td><StatusBadge value={user.account_status} />{user.suspension_reason && <div className="small text-danger mt-1">{user.suspension_reason}</div>}</td><td className="small"><div>{user.owned_mosques_count} managed mosque(s)</div><div>{user.followed_mosques_count} followed</div></td><td className="text-end"><button className={`btn btn-sm ${user.account_status === "suspended" ? "btn-outline-success" : "btn-outline-danger"}`} disabled={busy === user.id || user.id === currentUser?.id} onClick={() => toggleStatus(user)}>{user.account_status === "suspended" ? "Reactivate" : "Suspend"}</button></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function MosquesPanel() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const state = useRemoteData((signal) => fetchManagedMosques({ verification_status: status, search, page }, { signal }), [status, search, page]);

  const changeStatus = (mosque, nextStatus) => {
    const note = nextStatus === "rejected" ? window.prompt("Rejection reason (required):", "") : "";
    if (nextStatus === "rejected" && !note?.trim()) return;
    mutate(() => updateMosqueVerification(mosque.id, nextStatus, note), { ...state, setBusy, key: mosque.id });
  };

  return (
    <>
      <PanelHeader title="Mosque management" description="Inspect ownership and control platform-wide verification." onRefresh={state.refresh}>
        <input className="form-control form-control-sm" style={{ width: 210 }} placeholder="Mosque or address" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 165 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{["unverified", "pending", "verified", "rejected"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select>
      </PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>Mosque</th><th>Owner</th><th>Status</th><th>Platform activity</th><th>Verification control</th></tr></thead>
          <tbody>{state.data?.data?.map((mosque) => <tr key={mosque.id}><td><strong>{mosque.name}</strong><div className="small text-muted text-truncate" style={{ maxWidth: 240 }}>{mosque.address}</div></td><td>{mosque.owner ? <><strong>{mosque.owner.name}</strong><div className="small text-muted">{mosque.owner.phone}</div></> : <span className="text-muted">Unassigned</span>}</td><td><StatusBadge value={mosque.verification_status} /></td><td className="small">{mosque.followers_count} followers · {mosque.events_count} events · {mosque.campaigns_count} campaigns</td><td><select className="form-select form-select-sm" value={mosque.verification_status} disabled={busy === mosque.id} onChange={(e) => changeStatus(mosque, e.target.value)}>{["unverified", "pending", "verified", "rejected"].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function ModerationPanel() {
  const [type, setType] = useState("announcement");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const state = useRemoteData((signal) => fetchModerationQueue({ type, moderation_status: status, search, page }, { signal }), [type, status, search, page]);

  const moderate = (item, nextStatus) => {
    const note = nextStatus === "rejected" ? window.prompt("Moderation reason (required):", "") : "";
    if (nextStatus === "rejected" && !note?.trim()) return;
    mutate(() => updateContentModeration(type, item.id, nextStatus, note), { ...state, setBusy, key: item.id });
  };

  return (
    <>
      <PanelHeader title="Content moderation" description="Approve or hide announcements, events, and campaigns across the platform." onRefresh={state.refresh}>
        <input className="form-control form-control-sm" style={{ width: 180 }} placeholder="Search title" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="form-select form-select-sm" style={{ width: 145 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{["pending", "approved", "rejected"].map((item) => <option key={item}>{item}</option>)}</select>
      </PanelHeader>
      <div className="nav nav-pills gap-2 mb-3">{["announcement", "event", "campaign"].map((item) => <button className={`nav-link ${type === item ? "active" : ""}`} key={item} onClick={() => { setType(item); setPage(1); }}>{labelize(item)}s</button>)}</div>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>Content</th><th>Mosque</th><th>Publication</th><th>Reports</th><th>Moderation</th><th className="text-end">Actions</th></tr></thead>
          <tbody>{state.data?.data?.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><div className="small text-muted text-truncate" style={{ maxWidth: 260 }}>{item.body || item.summary || item.description}</div></td><td>{item.mosque?.name}</td><td><StatusBadge value={item.status} /></td><td><span className={`badge ${item.reports_count ? "bg-danger" : "bg-secondary"}`}>{item.reports_count}</span></td><td><StatusBadge value={item.moderation_status} />{item.moderation_note && <div className="small text-danger mt-1">{item.moderation_note}</div>}</td><td><div className="d-flex justify-content-end gap-1"><button className="btn btn-sm btn-outline-danger" disabled={busy === item.id || item.moderation_status === "rejected"} onClick={() => moderate(item, "rejected")}>Hide</button><button className="btn btn-sm btn-outline-success" disabled={busy === item.id || item.moderation_status === "approved"} onClick={() => moderate(item, "approved")}>Approve</button></div></td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function ReportsPanel() {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const state = useRemoteData((signal) => fetchReports({ status, type, page }, { signal }), [status, type, page]);

  const changeStatus = (report, nextStatus) => {
    const final = ["resolved", "dismissed"].includes(nextStatus);
    const note = final ? window.prompt("Resolution note (required):", "") : "";
    if (final && !note?.trim()) return;
    mutate(() => updateReport(report.id, nextStatus, note), { ...state, setBusy, key: report.id });
  };

  return (
    <>
      <PanelHeader title="Complaints and reports" description="Triage reports, investigate targets, and record a final resolution." onRefresh={state.refresh}>
        <select className="form-select form-select-sm" style={{ width: 145 }} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">All content</option>{["announcement", "event", "campaign", "mosque"].map((item) => <option key={item}>{item}</option>)}</select>
        <select className="form-select form-select-sm" style={{ width: 145 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{["pending", "reviewing", "resolved", "dismissed"].map((item) => <option key={item}>{item}</option>)}</select>
      </PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0">
          <thead className="table-light"><tr><th>Report</th><th>Target</th><th>Reporter</th><th>Status</th><th>Submitted</th><th>Resolution</th></tr></thead>
          <tbody>{state.data?.data?.map((report) => <tr key={report.id}><td><strong>{labelize(report.category)}</strong><div>{report.reason}</div>{report.details && <div className="small text-muted">{report.details}</div>}</td><td><span className="badge bg-light text-dark border me-1">{report.reportable_type}</span>{report.target?.title || `#${report.reportable_id}`}</td><td>{report.reporter?.name || "Deleted user"}<div className="small text-muted">{report.reporter?.phone}</div></td><td><StatusBadge value={report.status} /></td><td className="small text-muted">{dateTime(report.created_at)}</td><td><select className="form-select form-select-sm" value={report.status} disabled={busy === report.id} onChange={(e) => changeStatus(report, e.target.value)}>{["pending", "reviewing", "resolved", "dismissed"].map((item) => <option key={item}>{item}</option>)}</select>{report.resolution_note && <div className="small text-muted mt-1">{report.resolution_note}</div>}</td></tr>)}</tbody>
        </table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function StatisticsPanel() {
  const state = useRemoteData((signal) => fetchSystemStatistics({ signal }));
  return (
    <>
      <PanelHeader title="Platform statistics" description="Six-month growth and content totals." onRefresh={state.refresh} />
      <PanelState loading={state.loading} error={state.error} onRetry={state.refresh}>
        <div className="row g-3 mb-4">{Object.entries(state.data?.content || {}).map(([label, count]) => <div className="col-md-4" key={label}><div className="card border-0 shadow-sm p-4"><div className="text-muted small">{labelize(label)}</div><div className="fs-2 fw-bold">{count}</div></div></div>)}</div>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table mb-0"><thead className="table-light"><tr><th>Month</th><th>New users</th><th>New mosques</th><th>Claims</th><th>Reports</th></tr></thead><tbody>{state.data?.monthly?.map((month) => <tr key={month.key}><th>{month.label}</th><td>{month.users}</td><td>{month.mosques}</td><td>{month.claims}</td><td>{month.reports}</td></tr>)}</tbody></table></div></div>
      </PanelState>
    </>
  );
}

export function AuditPanel() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const state = useRemoteData((signal) => fetchAuditLogs({ search, page }, { signal }), [search, page]);
  return (
    <>
      <PanelHeader title="Administrative audit log" description="Immutable history of claims, user controls, moderation, reports, and settings." onRefresh={state.refresh}><input className="form-control form-control-sm" style={{ width: 210 }} placeholder="Search action or target" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></PanelHeader>
      <PanelState loading={state.loading} error={state.error} empty={!state.data?.data?.length} onRetry={state.refresh}>
        <div className="card border-0 shadow-sm"><div className="table-responsive"><table className="table align-middle mb-0"><thead className="table-light"><tr><th>Time</th><th>Administrator</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>{state.data?.data?.map((log) => <tr key={log.id}><td className="small text-muted text-nowrap">{dateTime(log.created_at)}</td><td>{log.actor?.name || "System"}<div className="small text-muted">{log.actor?.phone}</div></td><td><strong>{labelize(log.action.replaceAll(".", " "))}</strong></td><td>{log.target_type ? `${log.target_type} #${log.target_id || "—"}` : "—"}</td><td><code className="small text-wrap">{log.metadata ? JSON.stringify(log.metadata) : "—"}</code></td></tr>)}</tbody></table></div><Pager payload={state.data} onPage={setPage} /></div>
      </PanelState>
    </>
  );
}

export function SettingsPanel() {
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
      <PanelHeader title="System settings" description="Control platform-level availability and administrator notices." onRefresh={state.refresh} />
      <PanelState loading={state.loading} error={state.error} onRetry={state.refresh}>
        {form && <form className="card border-0 shadow-sm" onSubmit={save}><div className="card-body p-4">
          <div className="mb-4"><label className="form-label fw-semibold" htmlFor="maintenance-notice">Maintenance notice</label><textarea id="maintenance-notice" className="form-control" rows="3" maxLength="1000" value={form.maintenance_notice || ""} onChange={(e) => setForm({ ...form, maintenance_notice: e.target.value })} /><div className="form-text">Shown by future maintenance-notice integrations; leave empty when no notice is required.</div></div>
          {[["claims_enabled", "Accept mosque claims"], ["reports_enabled", "Accept user reports"], ["auto_publish_verified_mosques", "Publish verified mosques automatically"]].map(([key, label]) => <div className="form-check form-switch mb-3" key={key}><input className="form-check-input" type="checkbox" role="switch" id={key} checked={Boolean(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} /><label className="form-check-label fw-semibold" htmlFor={key}>{label}</label></div>)}
        </div><div className="card-footer bg-white text-end py-3"><button className="btn btn-mc" disabled={saving}>{saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : "Save system settings"}</button></div></form>}
      </PanelState>
    </>
  );
}

export function AccessError({ message }) {
  return <div className="alert alert-danger d-flex align-items-center gap-2"><CircleAlert size={18} />{message}</div>;
}
