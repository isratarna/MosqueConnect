export default function EventRegistrationButton({
  event,
  onRegister,
  onUnregister,
  isRegistered = false,
  loading = false,
  registrationEnabled = false,
  isPast = false,
}) {
  if (!event.registration_required) {
    return <span className="mc-event-registration-note">No registration needed</span>;
  }

  const canRegister = registrationEnabled
    && event.status === "published"
    && !isPast
    && !event.is_full
    && !isRegistered
    && Boolean(onRegister);
  const canUnregister = registrationEnabled && isRegistered && Boolean(onUnregister);

  let label = "Registration unavailable";
  if (loading) label = isRegistered ? "Cancelling..." : "Registering...";
  else if (isRegistered) label = "Cancel registration";
  else if (event.is_full) label = "Event full";
  else if (event.status === "cancelled") label = "Event cancelled";
  else if (event.status === "completed") label = "Event completed";
  else if (isPast) label = "Event ended";
  else if (event.status === "draft") label = "Registration unavailable";
  else if (canRegister) label = "Register";

  return (
    <button
      type="button"
      className={`btn btn-sm ${isRegistered ? "btn-success" : "btn-outline-mc"}`}
      disabled={(!canRegister && !canUnregister) || loading}
      onClick={() => (isRegistered ? onUnregister?.(event) : onRegister?.(event))}
    >
      {label}
    </button>
  );
}
