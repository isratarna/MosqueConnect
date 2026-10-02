import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import DashboardCard from "./DashboardCard";
import { fetchAdminAnnouncements, setAnnouncementPublished } from "../../../utils/dashboardApi";
import { formatShortDate } from "../../../utils/dashboardFormat";

export function AnnouncementStatusChip({ status }) {
  return status === "published"
    ? <span className="badge bg-success-subtle text-success border border-success-subtle">Published</span>
    : <span className="badge bg-warning-subtle text-dark border border-warning-subtle">Draft</span>;
}

/** The five latest announcements, with publish/unpublish in place. */
export default function AnnouncementsCard({ mosqueId, revision, onViewAll }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetchAdminAnnouncements(mosqueId, { signal: controller.signal })
      .then((data) => setItems(data))
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); });
    return () => controller.abort();
  }, [mosqueId, revision, retry]);

  const toggle = async (item) => {
    if (busyId) return;
    setBusyId(item.id);
    setActionError("");
    try {
      const updated = await setAnnouncementPublished(mosqueId, item.id, item.status !== "published");
      setItems((list) => list.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardCard
      title="Announcements"
      icon={Megaphone}
      loading={items === null && !error}
      error={error}
      onRetry={() => setRetry((n) => n + 1)}
      action={<button type="button" className="btn btn-link btn-sm text-mc p-0" onClick={onViewAll}>View all</button>}
    >
      {actionError && <div className="alert alert-danger py-2 small" role="alert">{actionError}</div>}
      {items?.length ? (
        <ul className="list-unstyled mb-0 mc-dash-list">
          {items.slice(0, 5).map((item) => (
            <li key={item.id}>
              <div className="min-w-0">
                <div className="fw-semibold text-truncate">{item.title}</div>
                <div className="small text-muted d-flex flex-wrap gap-2 align-items-center">
                  <AnnouncementStatusChip status={item.status} />
                  {item.urgency === "high" && <span className="badge bg-danger">Urgent</span>}
                  {item.moderation_status && item.moderation_status !== "approved" && <span className="badge bg-secondary">Moderation: {item.moderation_status}</span>}
                  <span>{formatShortDate(item.published_at || item.created_at)}</span>
                </div>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${item.status === "published" ? "btn-outline-warning" : "btn-outline-success"}`}
                disabled={busyId === item.id}
                onClick={() => toggle(item)}
                aria-label={`${item.status === "published" ? "Unpublish" : "Publish"} ${item.title}`}
              >
                {busyId === item.id ? "…" : item.status === "published" ? "Unpublish" : "Publish"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted small mb-0">No announcements yet. Use Quick post to write your first one.</p>
      )}
    </DashboardCard>
  );
}
