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
import { eventCategoryLabel } from "../utils/labels";
import { translate } from "../i18n/translate";
import { useLocale } from "../hooks/useLocale";
import {
  formatEventDate,
  formatEventTimeRange,
  getEventDisplayStatus,
  getEventMosqueName,
  isEventPast,
} from "../utils/eventFilters";
import { PageSkeleton } from "../components/skeletons";
import ReportButton from "../components/ReportButton";

export default function EventDetails() {
  const { t, locale } = useLocale();
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
        else setError(requestError.message || translate("event.details.loadFailed"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  if (loading) return <PageSkeleton label={t("event.details.loading")} />;
  if (notFound) return <EventUnavailable />;
  if (error || !event) return <EventDetailsState error={error || t("event.details.loadFailed")} />;

  const past = isEventPast(event);
  const mosqueName = getEventMosqueName(event, t("event.mosqueTbd"));
  const registered = registration.registeredEventIds.has(event.id);
  const registering = registration.registrationLoadingIds.has(event.id);
  const registrationMessage = getRegistrationMessage(event, past, registration.registrationEnabled, t);

  return (
    <section className="mc-event-details mc-atmospheric-section">
      <div className="container py-5">
        <nav aria-label={t("common.breadcrumb")} className="mb-3">
          <ol className="breadcrumb small mb-0">
            <li className="breadcrumb-item"><Link to="/" className="text-mc text-decoration-none">{t("nav.home")}</Link></li>
            <li className="breadcrumb-item"><Link to="/community?category=event" className="text-mc text-decoration-none">{t("event.details.communityEvents")}</Link></li>
            <li className="breadcrumb-item active" aria-current="page">{t("event.details.crumb")}</li>
          </ol>
        </nav>

        <EventRegistrationFeedback feedback={registration.feedback} onDismiss={registration.clearFeedback} />

        {(event.status === "cancelled" || past) && (
          <div className="alert alert-warning" role="status">
            {event.status === "cancelled" ? t("event.details.cancelledAlert") : t("event.details.endedAlert")}
          </div>
        )}

        <div className="mc-event-details__layout mc-motion-stagger">
          <article className="mc-event-details__content mc-card">
            <div className="mc-event-details__meta">
              <span className="mc-event-card__category">{eventCategoryLabel(t, event.category)}</span>
              <EventStatusBadge status={getEventDisplayStatus(event)} />
            </div>

            <h1>{event.title}</h1>
            <div className="mb-3"><ReportButton type="event" id={event.id} /></div>
            <p className="mc-event-details__mosque">{t("event.details.hostedBy", { name: mosqueName })}</p>

            <div className="mc-event-details__body">
              <h2>{t("event.details.about")}</h2>
              <p>{event.description || t("event.details.noDescription")}</p>
            </div>

            <section className="mc-event-details__registration" aria-labelledby="event-registration-heading">
              <h2 id="event-registration-heading">{t("event.details.registration")}</h2>
              <p>{registrationMessage}</p>
              <EventRegistrationButton
                event={event}
                onRegister={registration.register}
                onUnregister={registration.unregister}
                isRegistered={registered}
                loading={registering}
                registrationEnabled={registration.registrationEnabled}
                isPast={past}
              />
            </section>

            <div className="mc-event-details__actions">
              <Link to="/community?category=event" className="btn btn-outline-mc">
                <ArrowLeft size={16} aria-hidden="true" /> {t("event.details.backToCommunity")}
              </Link>
              {event.mosque?.id && <Link to={`/mosque/${event.mosque.id}`} className="btn btn-mc">{t("event.details.viewMosque")}</Link>}
            </div>
          </article>

          <aside className="mc-event-details__sidebar">
            <section className="mc-card mc-event-details__info">
              <h2>{t("event.details.info")}</h2>
              <dl>
                <InfoRow icon={CalendarDays} label={t("event.date")} value={formatEventDate(event.event_date, { locale, fallback: t("event.dateTbd") })} />
                <InfoRow icon={Clock3} label={t("event.time")} value={formatEventTimeRange(event, locale, t("event.timeTbd"))} />
                <InfoRow icon={MapPin} label={t("event.details.venue")} value={event.location || t("event.details.venueTbd")} />
                <InfoRow icon={UsersRound} label={t("event.details.capacity")} value={event.capacity == null ? t("common.notSpecified") : t("event.details.capacityPeople", { count: event.capacity })} />
                <InfoRow icon={UserRound} label={t("event.details.organizer")} value={event.creator?.name || mosqueName} />
              </dl>
            </section>

            <section className="mc-card mc-event-details__source">
              <p className="mc-card-eyebrow">{t("event.details.hostMosque")}</p>
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

function getRegistrationMessage(event, past, enabled, t) {
  if (!event.registration_required) return t("event.details.registrationNone");
  if (event.status === "cancelled") return t("event.details.registrationCancelled");
  if (event.status === "completed" || past) return t("event.details.registrationClosed");
  if (!enabled) return t("event.details.registrationDisabled");
  return t("event.details.registrationRequired");
}

function EventDetailsState({ message, error }) {
  const { t } = useLocale();

  return (
    <section className="mc-event-details mc-atmospheric-section">
      <div className="container py-5">
        <div className={`mc-event-details__state mc-card text-center${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>
          {error && <TriangleAlert size={42} className="text-warning" aria-hidden="true" />}
          <h1>{error ? t("event.details.loadFailedTitle") : message}</h1>
          {error && <p>{error}</p>}
          <Link to="/community?category=event" className="btn btn-mc">{t("event.details.backToCommunity")}</Link>
        </div>
      </div>
    </section>
  );
}

function EventUnavailable() {
  const { t } = useLocale();

  return (
    <section className="mc-event-details mc-atmospheric-section">
      <div className="container py-5">
        <div className="mc-event-details__state mc-card text-center">
          <TriangleAlert size={42} className="text-warning" aria-hidden="true" />
          <h1>{t("event.details.unavailableTitle")}</h1>
          <p>{t("event.details.unavailableCopy")}</p>
          <Link to="/community?category=event" className="btn btn-mc">
            <ArrowLeft size={16} aria-hidden="true" /> {t("event.details.browseUpcoming")}
          </Link>
        </div>
      </div>
    </section>
  );
}
