export default function EventRegistrationButton({
  event,
  onRegister,
  isRegistered = false,
  loading = false,
}) {
  if (!event.registration_required) {
    return <span className="mc-event-registration-note">No registration needed</span>;
  }

  const participantCount = event.participants_count ?? event.participant_count;
  const isFull = event.capacity !== null
    && event.capacity !== undefined
    && participantCount !== null
    && participantCount !== undefined
    && participantCount >= event.capacity;
  const canRegister = event.status === "published" && !isFull && !isRegistered && Boolean(onRegister);

  let label = "Registration coming soon";
  if (loading) label = "Registering...";
  else if (isRegistered) label = "Registered";
  else if (isFull) label = "Event full";
  else if (event.status === "cancelled") label = "Event cancelled";
  else if (event.status === "completed") label = "Event completed";
  else if (event.status === "draft") label = "Registration unavailable";
  else if (onRegister) label = "Register";

  return (
    <button
      type="button"
      className="btn btn-outline-mc btn-sm"
      disabled={!canRegister || loading}
      onClick={() => onRegister?.(event)}
    >
      {label}
    </button>
  );
}
