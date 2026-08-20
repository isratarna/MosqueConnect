import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  TriangleAlert,
  UserRound,
  UsersRound,
} from "lucide-react";
import EventRegistrationButton from "../components/events/EventRegistrationButton";
import EventRegistrationFeedback from "../components/events/EventRegistrationFeedback";
import EventStatusBadge from "../components/events/EventStatusBadge";
import useEventRegistration from "../hooks/useEventRegistration";
import { EventApiError, fetchEvent } from "../utils/eventApi";
import {
  formatEventDate,
  formatEventTimeRange,
  getEventDisplayStatus,
  getEventMosqueName,
  isEventPast,
} from "../utils/eventFilters";

export default function EventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const registration = useEventRegistration();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setNotFound(false);

    fetchEvent(id, { signal: controller.signal })
      .then(setEvent)
      .catch((requestError) => {
        if (requestError.name === "AbortError") return;
        if (requestError instanceof EventApiError && requestError.status === 404) setNotFound(true);
        else setError(requestError.message || "Event details could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  if (loading) return <EventDetailsState message="Loading event details..." />;
  if (notFound) return <EventUnavailable />;
  if (error || !event) return <EventDetailsState error={error || "Event details could not be loaded."} />;

  const past = isEventPast(event);
  const mosqueName = getEventMosqueName(event);
  const registered = registration.registeredEventIds.has(event.id);
  const registering = registration.registrationLoadingIds.has(event.id);
  const registrationMessage = getRegistrationMessage(event, past, registration.registrationEnabled);

  return (
    <section className="mc-event-details mc-atmospheric-section">
      <div className="container py-5">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb small mb-0">
            <li className="breadcrumb-item"><Link to="/" className="text-mc text-decoration-none">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/community?category=event" className="text-mc text-decoration-none">Community events</Link></li>
            <li className="breadcrumb-item active" aria-current="page">Event details</li>
          </ol>
        </nav>

        <EventRegistrationFeedback feedback={registration.feedback} onDismiss={registration.clearFeedback} />

        {(event.status === "cancelled" || past) && (
          <div className="alert alert-warning" role="status">
            {event.status === "cancelled" ? "This event has been cancelled." : "This event has already ended."}
          </div>
        )}

        <div className="mc-event-details__layout mc-motion-stagger">
          <article className="mc-event-details__content mc-card">
            <div className="mc-event-details__meta">
              <span className="mc-event-card__category">{event.category || "Other"}</span>
              <EventStatusBadge status={getEventDisplayStatus(event)} />
            </div>

            <h1>{event.title}</h1>
            <p className="mc-event-details__mosque">Hosted by {mosqueName}</p>

            <div className="mc-event-details__body">
              <h2>About this event</h2>
              <p>{event.description || "The organizer has not added a description yet."}</p>
            </div>

            <section className="mc-event-details__registration" aria-labelledby="event-registration-heading">
              <h2 id="event-registration-heading">Registration</h2>
              <p>{registrationMessage}</p>
              <EventRegistrationButton
                event={event}
                onRegister={registration.register}
                isRegistered={registered}
                loading={registering}
                registrationEnabled={registration.registrationEnabled}
                isPast={past}
              />
            </section>

            <div className="mc-event-details__actions">
              <Link to="/community?category=event" className="btn btn-outline-mc">
                <ArrowLeft size={16} aria-hidden="true" /> Back to Community
              </Link>
              {event.mosque?.id && <Link to={`/mosque/${event.mosque.id}`} className="btn btn-mc">View mosque</Link>}
            </div>
          </article>

          <aside className="mc-event-details__sidebar">
            <section className="mc-card mc-event-details__info">
              <h2>Event information</h2>
              <dl>
                <InfoRow icon={CalendarDays} label="Date" value={formatEventDate(event.event_date)} />
                <InfoRow icon={Clock3} label="Time" value={formatEventTimeRange(event)} />
                <InfoRow icon={MapPin} label="Venue" value={event.location || "To be announced"} />
                <InfoRow icon={UsersRound} label="Capacity" value={event.capacity == null ? "Not specified" : `${event.capacity} people`} />
                <InfoRow icon={UserRound} label="Organizer" value={event.creator?.name || mosqueName} />
              </dl>
            </section>

            <section className="mc-card mc-event-details__source">
              <p className="mc-card-eyebrow">Host mosque</p>
              <h2>{mosqueName}</h2>
              {event.mosque?.address && <p>{event.mosque.address}</p>}
              {event.mosque?.phone && <a href={`tel:${event.mosque.phone.replace(/\s/g, "")}`}>{event.mosque.phone}</a>}
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div>
      <dt><Icon size={15} aria-hidden="true" /> {label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function getRegistrationMessage(event, past, enabled) {
  if (!event.registration_required) return "No advance registration is required for this event.";
  if (event.status === "cancelled") return "Registration is unavailable because this event was cancelled.";
  if (event.status === "completed" || past) return "Registration has closed because this event has ended.";
  if (!enabled) return "Online registration is not available yet. Please contact the mosque for attendance information.";
  return "Registration is required. Sign in and reserve your place below.";
}

function EventDetailsState({ message, error }) {
  return (
    <section className="mc-event-details mc-atmospheric-section">
      <div className="container py-5">
        <div className={`mc-event-details__state mc-card text-center${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>
          {error && <TriangleAlert size={42} className="text-warning" aria-hidden="true" />}
          <h1>{error ? "Event details could not be loaded" : message}</h1>
          {error && <p>{error}</p>}
          <Link to="/community?category=event" className="btn btn-mc">Back to Community</Link>
        </div>
      </div>
    </section>
  );
}

function EventUnavailable() {
  return (
    <section className="mc-event-details mc-atmospheric-section">
      <div className="container py-5">
        <div className="mc-event-details__state mc-card text-center">
          <TriangleAlert size={42} className="text-warning" aria-hidden="true" />
          <h1>Event unavailable</h1>
          <p>This event may have been cancelled, deleted, or is no longer public.</p>
          <Link to="/community?category=event" className="btn btn-mc">
            <ArrowLeft size={16} aria-hidden="true" /> Browse upcoming events
          </Link>
        </div>
      </div>
    </section>
  );
}
