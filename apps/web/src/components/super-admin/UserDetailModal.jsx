import { useEffect, useState } from "react";
import Modal from "../Modal";
import { fetchManagedUser } from "../../utils/systemAdminApi";

const dateTime = (value) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const labelize = (value = "") => String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function Section({ title, empty, items, render }) {
  return (
    <section className="mb-4">
      <h3 className="h6 fw-bold">{title} <span className="badge bg-secondary-subtle text-secondary-emphasis">{items.length}</span></h3>
      {items.length === 0 ? <p className="small text-muted mb-0">{empty}</p> : <ul className="list-unstyled small mb-0">{items.map(render)}</ul>}
    </section>
  );
}

/** One account at a glance: mosques, claims, reports, donations and suspension history. */
export default function UserDetailModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchManagedUser(userId, { signal: controller.signal })
      .then((payload) => setData(payload.data))
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message); });
    return () => controller.abort();
  }, [userId]);

  const user = data?.user;

  return (
    <Modal title={user ? user.name : "User details"} onClose={onClose} size="modal-lg">
      {error && <div className="alert alert-danger">{error}</div>}
      {!data && !error && <div className="py-5 text-center text-muted"><span className="spinner-border spinner-border-sm me-2" />Loading…</div>}
      {data && (
        <>
          <div className="d-flex flex-wrap gap-3 small mb-4 border-bottom pb-3">
            <span><span className="text-muted">Phone</span> {user.phone}</span>
            {user.email && <span><span className="text-muted">Email</span> {user.email}</span>}
            <span><span className="text-muted">Role</span> {labelize(user.role)}</span>
            <span><span className="text-muted">Account</span> {labelize(user.account_status)}</span>
            <span><span className="text-muted">Joined</span> {dateTime(user.created_at)}</span>
            <span><span className="text-muted">Follows</span> {user.followed_mosques_count} mosque(s)</span>
          </div>
          {user.suspension_reason && <div className="alert alert-danger small">Suspended: {user.suspension_reason}</div>}
          <div className="row">
            <div className="col-md-6">
              <Section title="Managed mosques" empty="None." items={data.managed_mosques} render={(mosque) => <li key={mosque.id} className="d-flex justify-content-between border-bottom py-1"><span>{mosque.name}</span><span className="text-muted">{labelize(mosque.role || "")}</span></li>} />
              <Section title="Claims" empty="No claims submitted." items={data.claims} render={(claim) => <li key={claim.id} className="border-bottom py-1"><div className="d-flex justify-content-between"><span>{claim.mosque?.name || `Mosque #${claim.mosque_id}`}</span><span className="text-muted">{labelize(claim.status)}</span></div><div className="text-muted">{dateTime(claim.submitted_at)}{claim.ai_score != null && ` · AI ${Math.round(claim.ai_score * 100)}%`}</div></li>} />
              <Section title="Suspension history" empty="Never suspended." items={data.suspension_history} render={(entry) => <li key={entry.id} className="border-bottom py-1"><div className="d-flex justify-content-between"><span className={entry.status === "suspended" ? "text-danger" : "text-success"}>{labelize(entry.status)}</span><span className="text-muted">{dateTime(entry.created_at)}</span></div><div className="text-muted">{entry.reason ? `${entry.reason} · ` : ""}by {entry.actor?.name || "System"}</div></li>} />
            </div>
            <div className="col-md-6">
              <Section title="Reports filed" empty="No reports filed." items={data.reports} render={(report) => <li key={report.id} className="border-bottom py-1"><div className="d-flex justify-content-between"><span>{labelize(report.category)} · {report.reportable_type} #{report.reportable_id}</span><span className="text-muted">{labelize(report.status)}</span></div><div className="text-muted">{report.reason}</div></li>} />
              <Section title="Donations" empty="No donations recorded." items={data.donations} render={(donation) => <li key={donation.id} className="d-flex justify-content-between border-bottom py-1"><span>{donation.campaign?.title || `Campaign #${donation.campaign_id}`}</span><span className="text-muted">{Number(donation.amount).toLocaleString()} · {labelize(donation.status)}</span></li>} />
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
