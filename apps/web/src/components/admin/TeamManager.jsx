import { useCallback, useEffect, useState } from "react";
import { LogOut, Trash2, UserPlus, UsersRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Modal from "../Modal";
import { changeMemberRole, fetchTeam, inviteMember, leaveMosque, removeMember } from "../../utils/teamApi";
import { TEAM_ROLES, can, invitableRoles, toInternationalPhone } from "../../utils/teamRoles";
import { BlockStack, SkeletonRegion } from "../skeletons";
import { useLocale } from "../../hooks/useLocale";

// [Urmee · i18n dashboard] Dates follow the active language; role names and descriptions are looked up by role code.
const dateLabel = (value, locale) => (value ? new Date(value).toLocaleDateString(locale === "en-BD" ? "en-GB" : locale, { day: "numeric", month: "short", year: "numeric" }) : "");

/**
 * The mosque's team: who helps run it and with what role. Owners and
 * managers invite people by phone number; only owners change roles or remove
 * members; anyone can leave (except the last owner).
 */
export default function TeamManager({ mosqueId, mosqueName, onLeft }) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const roleName = (role, fallback) => t(`dashboard.roles.${role}`, { defaultValue: fallback || role });
  const [team, setTeam] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [invite, setInvite] = useState({ phone: "", role: "editor" });

  const reload = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    fetchTeam(mosqueId, { signal: controller.signal })
      .then(setTeam)
      .catch((err) => { if (err.name !== "AbortError") setLoadError(err.message); });
    return () => controller.abort();
  }, [mosqueId, revision]);

  const run = async (key, task, success) => {
    setBusy(key);
    setError("");
    setMessage("");
    try {
      const result = await task();
      setMessage(result?.message || success);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const abilities = team?.abilities || [];
  const canInvite = can(abilities, "team");
  const canManageMembers = can(abilities, "members");
  const members = team?.data || [];
  const active = members.filter((member) => member.status === "active");
  const pending = members.filter((member) => member.status === "pending");

  const sendInvite = async (event) => {
    event.preventDefault();
    const phone = toInternationalPhone(invite.phone);
    if (!phone) return setError(t("team.enterPhone"));
    const ok = await run("invite", () => inviteMember(mosqueId, phone, invite.role), t("team.inviteSent"));
    if (ok) {
      setInvite((current) => ({ ...current, phone: "" }));
      reload();
    }
  };

  const setRole = (member, role) => run(`role-${member.id}`, () => changeMemberRole(mosqueId, member.id, role), t("team.roleUpdated")).then((ok) => ok && reload());

  const confirmAction = async () => {
    const { kind, member } = confirm;
    const ok = kind === "leave"
      ? await run("leave", () => leaveMosque(mosqueId), t("team.left"))
      : await run(`remove-${member.id}`, () => removeMember(mosqueId, member.id), t("team.removed"));
    setConfirm(null);
    if (ok && kind === "leave") onLeft?.();
    else if (ok) reload();
  };

  if (loadError) {
    return <div className="alert alert-danger" role="alert">{loadError} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={reload}>{t("common.retry")}</button></div>;
  }

  if (!team) {
    return <SkeletonRegion label={t("team.loading")}><BlockStack heights={[40, 160]} /></SkeletonRegion>;
  }

  return (
    <div className="mc-team">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
        <div>
          <h2 className="h5 fw-bold mb-1"><UsersRound size={19} className="text-mc me-2" aria-hidden="true" />{t("team.title")}</h2>
          <p className="text-muted small mb-0">
            {t("team.intro", { mosque: mosqueName || t("team.thisMosque") })}
            {team.role && <> {t("team.yourRole")} <strong>{roleName(team.role)}</strong>.</>}
          </p>
        </div>
        {team.role && (
          <button type="button" className="btn btn-sm btn-outline-danger" disabled={Boolean(busy)} onClick={() => setConfirm({ kind: "leave" })}>
            <LogOut size={15} aria-hidden="true" /> {t("team.leave")}
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      {message && <div className="alert alert-success py-2" role="status">{message}</div>}

      {canInvite && (
        <form className="mc-team-invite border rounded-3 p-3 mb-4" onSubmit={sendInvite}>
          <h3 className="h6 fw-bold mb-2"><UserPlus size={16} className="text-mc me-1" aria-hidden="true" />{t("team.inviteTitle")}</h3>
          <div className="row g-2 align-items-end">
            <div className="col-sm-6">
              <label className="form-label small" htmlFor="team-invite-phone">{t("team.phone")}</label>
              <input id="team-invite-phone" className="form-control" type="tel" inputMode="tel" autoComplete="off" placeholder="01712 345678" value={invite.phone} onChange={(e) => setInvite((current) => ({ ...current, phone: e.target.value }))} required />
            </div>
            <div className="col-sm-4">
              <label className="form-label small" htmlFor="team-invite-role">{t("team.role")}</label>
              <select id="team-invite-role" className="form-select" value={invite.role} onChange={(e) => setInvite((current) => ({ ...current, role: e.target.value }))}>
                {invitableRoles(abilities).map((role) => <option key={role.value} value={role.value}>{roleName(role.value, role.label)}</option>)}
              </select>
            </div>
            <div className="col-sm-2 d-grid">
              <button className="btn btn-mc" disabled={busy === "invite"}>{busy === "invite" ? t("team.sending") : t("team.invite")}</button>
            </div>
          </div>
          <p className="form-text mb-0">{t(`team.roleDescriptions.${invite.role}`, { defaultValue: "" })} {t("team.inviteHelp")}</p>
        </form>
      )}

      <h3 className="mc-dash-subhead">{t("team.members")} <span className="badge bg-secondary-subtle text-secondary">{active.length}</span></h3>
      <ul className="list-unstyled mc-dash-list mb-4">
        {active.map((member) => {
          const isMe = member.user?.id === user?.id;
          return (
            <li key={member.id}>
              <div className="min-w-0">
                <div className="fw-semibold text-truncate">
                  {member.user?.name || member.phone}
                  {isMe && <span className="badge bg-primary ms-2">{t("team.you")}</span>}
                </div>
                <div className="small text-muted">{member.phone}{member.accepted_at ? ` · ${t("team.joined", { date: dateLabel(member.accepted_at, locale) })}` : ""}</div>
              </div>
              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                {canManageMembers ? (
                  <>
                    <label className="visually-hidden" htmlFor={`member-role-${member.id}`}>{t("team.roleFor", { name: member.user?.name || member.phone })}</label>
                    <select id={`member-role-${member.id}`} className="form-select form-select-sm" style={{ width: 140 }} value={member.role} disabled={Boolean(busy)} onChange={(e) => setRole(member, e.target.value)}>
                      {TEAM_ROLES.map((role) => <option key={role.value} value={role.value}>{roleName(role.value, role.label)}</option>)}
                    </select>
                    {!isMe && (
                      <button type="button" className="btn btn-sm btn-outline-danger" disabled={Boolean(busy)} aria-label={t("team.removeAria", { name: member.user?.name || member.phone })} onClick={() => setConfirm({ kind: "remove", member })}>
                        <Trash2 size={14} aria-hidden="true" /> <span className="d-none d-md-inline">{t("team.remove")}</span>
                      </button>
                    )}
                  </>
                ) : (
                  <span className={`badge ${member.role === "owner" ? "bg-success" : "bg-light text-dark border"}`}>{roleName(member.role, member.role_label)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {pending.length > 0 && (
        <>
          <h3 className="mc-dash-subhead">{t("team.waiting")} <span className="badge bg-warning text-dark">{pending.length}</span></h3>
          <ul className="list-unstyled mc-dash-list mb-4">
            {pending.map((member) => (
              <li key={member.id}>
                <div className="min-w-0">
                  <div className="fw-semibold text-truncate">{member.user?.name || member.phone}</div>
                  <div className="small text-muted">
                    {roleName(member.role, member.role_label)} · {t("team.invited", { date: dateLabel(member.invited_at, locale) })}{member.invited_by ? t("team.invitedBy", { name: member.invited_by.name }) : ""}
                    {!member.has_account && ` · ${t("team.noAccount")}`}
                  </div>
                </div>
                {canInvite && (
                  <button type="button" className="btn btn-sm btn-outline-secondary flex-shrink-0" disabled={Boolean(busy)} onClick={() => setConfirm({ kind: "cancel", member })}>
                    {t("team.cancelInvite")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <details className="small text-muted">
        <summary>{t("team.whatRolesDo")}</summary>
        <ul className="mt-2 mb-0">
          {TEAM_ROLES.map((role) => <li key={role.value}><strong>{roleName(role.value, role.label)}:</strong> {t(`team.roleDescriptions.${role.value}`, { defaultValue: role.description })}</li>)}
        </ul>
      </details>

      {confirm && (
        <Modal
          title={confirm.kind === "leave" ? t("team.confirmLeaveTitle") : confirm.kind === "cancel" ? t("team.confirmCancelTitle") : t("team.confirmRemoveTitle")}
          onClose={() => setConfirm(null)}
          busy={Boolean(busy)}
          footer={(
            <>
              <button type="button" className="btn btn-light" onClick={() => setConfirm(null)} disabled={Boolean(busy)}>{t("team.keep")}</button>
              <button type="button" className="btn btn-danger" onClick={confirmAction} disabled={Boolean(busy)}>
                {confirm.kind === "leave" ? t("team.confirmLeave") : confirm.kind === "cancel" ? t("team.confirmCancel") : t("team.confirmRemove")}
              </button>
            </>
          )}
        >
          {confirm.kind === "leave"
            ? <p className="mb-0">{t("team.leaveBody", { mosque: mosqueName })}</p>
            : <p className="mb-0">{t(confirm.kind === "cancel" ? "team.cancelBody" : "team.removeBody", { name: confirm.member.user?.name || confirm.member.phone, mosque: mosqueName })}</p>}
        </Modal>
      )}
    </div>
  );
}
