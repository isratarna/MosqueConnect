import { CalendarDays, Clock3, MapPin, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import EventRegistrationButton from "./EventRegistrationButton";
import EventStatusBadge from "./EventStatusBadge";
import {
  formatEventDate,
  formatEventTimeRange,
  getEventDisplayStatus,
  getEventMosqueName,
  isEventPast,
} from "../../utils/eventFilters";

function capacityLabel(event) {
  if (event.capacity !== null && event.capacity !== undefined) return `Capacity: ${event.capacity}`;

  return "Capacity not specified";
}

export default function EventCard({
  event,
  onRegister,
  isRegistered,
  registrationLoading,
  registrationEnabled,
}) {
  const mosqueName = getEventMosqueName(event);
  const past = isEventPast(event);
  const detailsPath = `/community/events/${event.id}`;

  return (
    <article className="mc-event-card mc-card">
      <div className="mc-event-card__meta">
        <span className="mc-event-card__category">{event.category || "Other"}</span>
        <EventStatusBadge status={getEventDisplayStatus(event)} />
      </div>

      <h3><Link className="mc-event-card__title-link" to={detailsPath}>{event.title}</Link></h3>
      <p className="mc-event-card__mosque">{mosqueName}</p>

      <dl className="mc-event-card__details">
        <div>
          <dt><CalendarDays size={15} aria-hidden="true" /><span className="visually-hidden">Date</span></dt>
          <dd>{formatEventDate(event.event_date, { compact: true })}</dd>
        </div>
        <div>
          <dt><Clock3 size={15} aria-hidden="true" /><span className="visually-hidden">Time</span></dt>
          <dd>{formatEventTimeRange(event)}</dd>
        </div>
        <div>
          <dt><MapPin size={15} aria-hidden="true" /><span className="visually-hidden">Location</span></dt>
          <dd>{event.location || "Location to be announced"}</dd>
        </div>
        <div>
          <dt><UsersRound size={15} aria-hidden="true" /><span className="visually-hidden">Capacity</span></dt>
          <dd>{capacityLabel(event)}</dd>
        </div>
      </dl>

      <div className="mc-event-card__footer">
        <EventRegistrationButton
          event={event}
          onRegister={onRegister}
          isRegistered={isRegistered}
          loading={registrationLoading}
          registrationEnabled={registrationEnabled}
          isPast={past}
        />
        <Link className="mc-event-card__details-link" to={detailsPath}>View details</Link>
      </div>
    </article>
  );
}
