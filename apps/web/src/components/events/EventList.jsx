import { CalendarX2, CircleAlert, LoaderCircle } from "lucide-react";
import EventCard from "./EventCard";
import ScrollRail from "../ScrollRail";
import { useTranslation } from "react-i18next";

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
  emptyMessage,
  // "rail" lays the cards out as a horizontal scroller instead of a grid, which
  // suits a browsable run of upcoming events better than a grid that leaves a
  // hole whenever the count is not a multiple of the column count.
  layout = "grid",
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="mc-event-state" role="status">
        <LoaderCircle className="mc-event-state__spinner" size={28} aria-hidden="true" />
        <span>{t("event.list.loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mc-event-state is-error" role="alert">
        <CircleAlert size={28} aria-hidden="true" />
        <strong>{t("event.list.loadError")}</strong>
        <span>{error}</span>
        {onRetry && <button type="button" className="btn btn-outline-mc btn-sm" onClick={onRetry}>{t("common.tryAgain")}</button>}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="mc-event-state">
        <CalendarX2 size={28} aria-hidden="true" />
        <span>{emptyMessage ?? t("event.list.empty")}</span>
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
      <ScrollRail className="mc-event-rail" label={t("event.list.railLabel")}>
        {cards}
      </ScrollRail>
    );
  }

  return <div className="mc-event-list">{cards}</div>;
}
