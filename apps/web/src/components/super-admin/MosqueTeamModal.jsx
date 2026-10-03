import { useCallback, useEffect, useState } from "react";
import { Crown, Search, Trash2 } from "lucide-react";
import Modal from "../Modal";
import { fetchManagedUsers } from "../../utils/systemAdminApi";
import { fetchMosqueTeamAsSuperAdmin, revokeMember, transferOwnership } from "../../utils/teamApi";
import { BlockStack, SkeletonRegion } from "../skeletons";

/**
 * Super-admin view of one mosque's team: revoke anyone's access, or transfer
 * ownership to another account. Both actions are written to the audit log.
 */
export default function MosqueTeamModal({ mosque, onClose, onChanged }) {
  const [members, setMembers] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [previousOwners, setPreviousOwners] = useState("manager");
  const [confirmRevoke, setConfirmRevoke] = useState(null);

  const reload = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    fetchMosqueTeamAsSuperAdmin(mosque.id, { signal: controller.signal })
      .then(setMembers)
      .catch((err) => { if (err.name !== "AbortError") setLoadError(err.message); });
    return () => controller.abort();
  }, [mosque.id, revision]);

  const run = async (key, task) => {
    setBusy(key);
    setError("");
    setMessage("");
    try {
      const response = await task();
      setMessage(response?.message || "Done.");
      reload();
      onChanged?.();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const findUsers = async (event) => {
    event.preventDefault();
    if (!search.trim()) return;
    setBusy("search");
    setError("");
    try {
      const response = await fetchManagedUsers({ search: search.trim(), per_page: 8 });
      setResults((response.data || []).filter((user) => user.role !== "super_admin"));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const transfer = async () => {
    const ok = await run("transfer", () => transferOwnership(mosque.id, chosen.id, previousOwners));
    if (ok) {
      setChosen(null);
      setResults(null);
      setSearch("");
    }
  };

  const revoke = async () => {
    const member = confirmRevoke;
    setConfirmRevoke(null);
    await run(`revoke-${member.id}`, () => revokeMember(mosque.id, member.user.id));
  };

  return (
    <Modal title={`Team · ${mosque.name}`} onClose={onClose} busy={Boolean(busy)} size="modal-lg">
      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
      {message && <div className="alert alert-success py-2" role="status">{message}</div>}

      <h3 className="h6 fw-bold">Members</h3>
      {loadError ? (
        <div className="alert alert-danger py-2">{loadError} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={reload}>Retry</button></div>
      ) : !members ? (
        <SkeletonRegion label="Loading team…"><BlockStack heights={[40, 40, 40]} /></SkeletonRegion>
      ) : members.length === 0 ? (
        <p className="text-muted small">Nobody manages this mosque yet.</p>
      ) : (
        <div className="table-responsive mb-3">
          <table className="table table-sm align-middle mb-0">
            <thead className="table-light"><tr><th>Person</th><th>Role</th><th>Status</th><th className="text-end">Access</th></tr></thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td><strong>{member.user?.name || "No account yet"}</strong><div className="small text-muted">{member.phone}</div></td>
                  <td>{member.role === "owner" && <Crown size={14} className="text-warning me-1" aria-hidden="true" />}{member.role_label}</td>
                  <td><span className={`badge ${member.status === "active" ? "bg-success" : "bg-warning text-dark"}`}>{member.status === "active" ? "Active" : "Invited"}</span></td>
                  <td className="text-end">
                    {member.user && (
                      <button type="button" className="btn btn-sm btn-outline-danger" disabled={Boolean(busy)} onClick={() => setConfirmRevoke(member)}>
                        <Trash2 size={14} aria-hidden="true" /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmRevoke && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center gap-2" role="alertdialog" aria-label="Confirm revoke">
          <span className="me-auto">
            Remove <strong>{confirmRevoke.user.name}</strong> from this mosque?
            {confirmRevoke.role === "owner" && members?.filter((m) => m.role === "owner" && m.status === "active").length === 1 && " They are the only owner, so the mosque will have no owner until you transfer it."}
          </span>
          <button type="button" className="btn btn-sm btn-light" onClick={() => setConfirmRevoke(null)}>Keep</button>
          <button type="button" className="btn btn-sm btn-danger" onClick={revoke}>Revoke access</button>
        </div>
      )}

      <h3 className="h6 fw-bold mt-4">Transfer ownership</h3>
      <form className="d-flex gap-2 mb-2" onSubmit={findUsers}>
        <label className="visually-hidden" htmlFor="transfer-search">Find the new owner</label>
        <input id="transfer-search" className="form-control form-control-sm" placeholder="Name or phone of the new owner" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-sm btn-outline-secondary" disabled={busy === "search"}><Search size={14} aria-hidden="true" /> Find</button>
      </form>
      {results && (results.length === 0 ? (
        <p className="small text-muted">No matching accounts. The new owner needs to sign in once first.</p>
      ) : (
        <div className="list-group list-group-flush border rounded mb-2">
          {results.map((user) => (
            <label key={user.id} className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${chosen?.id === user.id ? "active" : ""}`}>
              <input type="radio" name="transfer-user" className="form-check-input mt-0" checked={chosen?.id === user.id} onChange={() => setChosen(user)} />
              <span className="me-auto"><strong>{user.name}</strong> <span className="small">{user.phone}</span></span>
              <span className="small">{user.role.replace("_", " ")}</span>
            </label>
          ))}
        </div>
      ))}
      {chosen && (
        <div className="border rounded p-3">
          <p className="mb-2 small">Make <strong>{chosen.name}</strong> the owner of {mosque.name}. The current owners should:</p>
          <div className="form-check">
            <input id="previous-manager" type="radio" className="form-check-input" checked={previousOwners === "manager"} onChange={() => setPreviousOwners("manager")} />
            <label htmlFor="previous-manager" className="form-check-label small">stay on the team as managers</label>
          </div>
          <div className="form-check mb-2">
            <input id="previous-remove" type="radio" className="form-check-input" checked={previousOwners === "remove"} onChange={() => setPreviousOwners("remove")} />
            <label htmlFor="previous-remove" className="form-check-label small">be removed from the team</label>
          </div>
          <button type="button" className="btn btn-sm btn-mc" disabled={Boolean(busy)} onClick={transfer}><Crown size={14} aria-hidden="true" /> Transfer ownership</button>
        </div>
      )}
      <p className="form-text mb-0 mt-3">Transfers and revocations are recorded in the audit log.</p>
    </Modal>
  );
}
