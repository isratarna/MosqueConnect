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
import { eventCategoryLabel } from "../../utils/labels";
import { useLocale } from "../../hooks/useLocale";

export default function EventCard({
  event,
  onRegister,
  onUnregister,
  isRegistered,
  registrationLoading,
  registrationEnabled,
}) {
  const { t, locale } = useLocale();
  const mosqueName = getEventMosqueName(event, t("event.mosqueTbd"));
  const past = isEventPast(event);
  const detailsPath = `/community/events/${event.id}`;

  return (
    <article className="mc-event-card mc-card">
      <div className="mc-event-card__meta">
        <span className="mc-event-card__category">{eventCategoryLabel(t, event.category)}</span>
        <EventStatusBadge status={getEventDisplayStatus(event)} />
      </div>

      <h3><Link className="mc-event-card__title-link" to={detailsPath}>{event.title}</Link></h3>
      <p className="mc-event-card__mosque">{mosqueName}</p>

      <dl className="mc-event-card__details">
        <div>
          <dt><CalendarDays size={15} aria-hidden="true" /><span className="visually-hidden">{t("event.date")}</span></dt>
          <dd>{formatEventDate(event.event_date, { compact: true, locale, fallback: t("event.dateTbd") })}</dd>
        </div>
        <div>
          <dt><Clock3 size={15} aria-hidden="true" /><span className="visually-hidden">{t("event.time")}</span></dt>
          <dd>{formatEventTimeRange(event, locale, t("event.timeTbd"))}</dd>
        </div>
        <div>
          <dt><MapPin size={15} aria-hidden="true" /><span className="visually-hidden">{t("event.location")}</span></dt>
          <dd>{event.location || t("event.locationTbd")}</dd>
        </div>
        <div>
          <dt><UsersRound size={15} aria-hidden="true" /><span className="visually-hidden">{t("event.capacityLabel")}</span></dt>
          <dd>{event.capacity !== null && event.capacity !== undefined ? t("event.capacity", { capacity: event.capacity }) : t("event.capacityNotSpecified")}</dd>
        </div>
      </dl>

      <div className="mc-event-card__footer">
        <EventRegistrationButton
          event={event}
          onRegister={onRegister}
          onUnregister={onUnregister}
          isRegistered={isRegistered}
          loading={registrationLoading}
          registrationEnabled={registrationEnabled}
          isPast={past}
        />
        <Link className="mc-event-card__details-link" to={detailsPath}>{t("common.viewDetails")}</Link>
      </div>
    </article>
  );
}
