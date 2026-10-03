import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// `feedback` is { type, key?, message?, loginRequired? }: either a translation
// key for messages the app words itself, or a message returned by the server.
export default function EventRegistrationFeedback({ feedback, onDismiss }) {
  const { t } = useTranslation();
  if (!feedback) return null;

  return (
    <div className={`alert alert-${feedback.type} mc-event-feedback`} role="alert" aria-live="polite">
      <span>{feedback.message ?? t(feedback.key)}</span>
      <div className="d-flex align-items-center gap-2 ms-auto">
        {feedback.loginRequired && <Link to="/login" className="alert-link">{t("event.feedback.login")}</Link>}
        <button type="button" className="btn-close" aria-label={t("event.feedback.dismiss")} onClick={onDismiss} />
      </div>
    </div>
  );
}
