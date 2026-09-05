import { CalendarX2, CircleAlert, LoaderCircle } from "lucide-react";
import EventCard from "./EventCard";
import ScrollRail from "../ScrollRail";

export default function EventList({
  events = [],
  loading = false,
  error = "",
  onRetry,
  onRegister,
  onUnregister,
  registeredEventIds = new Set(),
  registrationLoadingIds = new Set(),
  registrationEnabled = false,
  emptyMessage = "No published events are available right now.",
  // "rail" lays the cards out as a horizontal scroller instead of a grid, which
  // suits a browsable run of upcoming events better than a grid that leaves a
  // hole whenever the count is not a multiple of the column count.
  layout = "grid",
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

  const cards = events.map((event) => (
    <EventCard
      event={event}
      onRegister={onRegister}
      onUnregister={onUnregister}
      isRegistered={registeredEventIds.has(event.id)}
      registrationLoading={registrationLoadingIds.has(event.id)}
      registrationEnabled={registrationEnabled}
      key={event.id}
    />
  ));

  if (layout === "rail") {
    return (
      <ScrollRail className="mc-event-rail" label="upcoming events">
        {cards}
      </ScrollRail>
    );
  }

  return <div className="mc-event-list">{cards}</div>;
}
