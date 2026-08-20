import { Link } from "react-router-dom";

export default function EventRegistrationFeedback({ feedback, onDismiss }) {
  if (!feedback) return null;

  return (
    <div className={`alert alert-${feedback.type} mc-event-feedback`} role="alert" aria-live="polite">
      <span>{feedback.message}</span>
      <div className="d-flex align-items-center gap-2 ms-auto">
        {feedback.loginRequired && <Link to="/login" className="alert-link">Log in</Link>}
        <button type="button" className="btn-close" aria-label="Dismiss message" onClick={onDismiss} />
      </div>
    </div>
  );
}
