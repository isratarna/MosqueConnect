export default function EventRegistrationButton({
  event,
  onRegister,
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
    && !isRegistered
    && Boolean(onRegister);

  let label = "Registration unavailable";
  if (loading) label = "Registering...";
  else if (isRegistered) label = "Registered";
  else if (event.status === "cancelled") label = "Event cancelled";
  else if (event.status === "completed") label = "Event completed";
  else if (isPast) label = "Event ended";
  else if (event.status === "draft") label = "Registration unavailable";
  else if (canRegister) label = "Register";

  return (
    <button
      type="button"
      className={`btn btn-sm ${isRegistered ? "btn-success" : "btn-outline-mc"}`}
      disabled={!canRegister || loading}
      onClick={() => onRegister?.(event)}
    >
      {label}
    </button>
  );
}
