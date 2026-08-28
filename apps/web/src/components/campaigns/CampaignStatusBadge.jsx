const STATUS_LABELS = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export default function CampaignStatusBadge({ status }) {
  return <span className={`mc-campaign-status is-${status || "draft"}`}>{STATUS_LABELS[status] || status}</span>;
}
