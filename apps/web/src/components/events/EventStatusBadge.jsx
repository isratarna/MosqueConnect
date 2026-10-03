const STATUS_LABELS = {
  draft: "Draft",
  published: "Published",
  cancelled: "Cancelled",
  completed: "Completed",
  past: "Past event",
};

export default function EventStatusBadge({ status }) {
  const normalizedStatus = STATUS_LABELS[status] ? status : "published";

  return (
    <span className={`mc-event-status is-${normalizedStatus}`}>
      {STATUS_LABELS[normalizedStatus]}
    </span>
  );
}
