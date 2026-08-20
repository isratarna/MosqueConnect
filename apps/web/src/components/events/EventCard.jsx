import { CalendarDays, Clock3, MapPin, UsersRound } from "lucide-react";
import EventRegistrationButton from "./EventRegistrationButton";
import EventStatusBadge from "./EventStatusBadge";

function formatEventDate(value) {
  if (!value) return "Date to be announced";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(value) {
  if (!value) return null;

  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return value;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function participantLabel(event) {
  const count = event.participants_count ?? event.participant_count;

  if (count !== null && count !== undefined && event.capacity !== null && event.capacity !== undefined) {
    return `${count} of ${event.capacity} attending`;
  }

  if (count !== null && count !== undefined) return `${count} attending`;
  if (event.capacity !== null && event.capacity !== undefined) return `Capacity: ${event.capacity}`;

  return "Capacity not specified";
}

export default function EventCard({ event, onRegister, isRegistered, registrationLoading }) {
  const startTime = formatTime(event.start_time);
  const endTime = formatTime(event.end_time);
  const timeLabel = [startTime, endTime].filter(Boolean).join(" - ") || "Time to be announced";
  const mosqueName = event.mosque?.name || event.mosque_name || "Mosque to be announced";

  return (
    <article className="mc-event-card mc-card">
      <div className="mc-event-card__meta">
        <span className="mc-event-card__category">{event.category || "Other"}</span>
        <EventStatusBadge status={event.status} />
      </div>

      <h3>{event.title}</h3>
      <p className="mc-event-card__mosque">{mosqueName}</p>
      {event.description && <p className="mc-event-card__description">{event.description}</p>}

      <dl className="mc-event-card__details">
        <div>
          <dt><CalendarDays size={15} aria-hidden="true" /><span className="visually-hidden">Date</span></dt>
          <dd>{formatEventDate(event.event_date)}</dd>
        </div>
        <div>
          <dt><Clock3 size={15} aria-hidden="true" /><span className="visually-hidden">Time</span></dt>
          <dd>{timeLabel}</dd>
        </div>
        <div>
          <dt><MapPin size={15} aria-hidden="true" /><span className="visually-hidden">Location</span></dt>
          <dd>{event.location || "Location to be announced"}</dd>
        </div>
        <div>
          <dt><UsersRound size={15} aria-hidden="true" /><span className="visually-hidden">Participants</span></dt>
          <dd>{participantLabel(event)}</dd>
        </div>
      </dl>

      <div className="mc-event-card__footer">
        <EventRegistrationButton
          event={event}
          onRegister={onRegister}
          isRegistered={isRegistered}
          loading={registrationLoading}
        />
      </div>
    </article>
  );
}
