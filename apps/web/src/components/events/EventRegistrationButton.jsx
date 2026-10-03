import { useTranslation } from "react-i18next";

export default function EventRegistrationButton({
  event,
  onRegister,
  onUnregister,
  isRegistered = false,
  loading = false,
  registrationEnabled = false,
  isPast = false,
}) {
  const { t } = useTranslation();

  if (!event.registration_required) {
    return <span className="mc-event-registration-note">{t("event.button.noRegistration")}</span>;
  }

  const canRegister = registrationEnabled
    && event.status === "published"
    && !isPast
    && !event.is_full
    && !isRegistered
    && Boolean(onRegister);
  const canUnregister = registrationEnabled && isRegistered && Boolean(onUnregister);

  let label = t("event.button.unavailable");
  if (loading) label = isRegistered ? t("event.button.cancelling") : t("event.button.registering");
  else if (isRegistered) label = t("event.button.cancel");
  else if (event.is_full) label = t("event.button.full");
  else if (event.status === "cancelled") label = t("event.button.cancelled");
  else if (event.status === "completed") label = t("event.button.completed");
  else if (isPast) label = t("event.button.ended");
  else if (event.status === "draft") label = t("event.button.unavailable");
  else if (canRegister) label = t("event.button.register");

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
