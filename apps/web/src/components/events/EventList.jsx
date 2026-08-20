import { CalendarX2, CircleAlert, LoaderCircle } from "lucide-react";
import EventCard from "./EventCard";

export default function EventList({
  events = [],
  loading = false,
  error = "",
  onRetry,
  onRegister,
  emptyMessage = "No published events are available right now.",
}) {
  if (loading) {
    return (
      <div className="mc-event-state" role="status">
        <LoaderCircle className="mc-event-state__spinner" size={28} aria-hidden="true" />
        <span>Loading community events...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mc-event-state is-error" role="alert">
        <CircleAlert size={28} aria-hidden="true" />
        <strong>Events could not be loaded</strong>
        <span>{error}</span>
        {onRetry && <button type="button" className="btn btn-outline-mc btn-sm" onClick={onRetry}>Try again</button>}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="mc-event-state">
        <CalendarX2 size={28} aria-hidden="true" />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="mc-event-list">
      {events.map((event) => (
        <EventCard event={event} onRegister={onRegister} key={event.id} />
      ))}
    </div>
  );
}
