const STATUS_LABELS = {
  draft: "Draft",
  published: "Published",
  cancelled: "Cancelled",
  completed: "Completed",
};

export default function EventStatusBadge({ status }) {
  const normalizedStatus = STATUS_LABELS[status] ? status : "draft";

  return (
    <span className={`mc-event-status is-${normalizedStatus}`}>
      {STATUS_LABELS[normalizedStatus]}
    </span>
  );
}
