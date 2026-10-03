import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import useEventRegistration from "../../hooks/useEventRegistration";
import { useTranslation } from "react-i18next";
import { translate } from "../../i18n/translate";
import { fetchEventCollection } from "../../utils/eventApi";
import { filterEvents } from "../../utils/eventFilters";
import EventList from "./EventList";
import EventRegistrationFeedback from "./EventRegistrationFeedback";

export default function MosqueEventsSection({ mosqueId }) {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestKey, setRequestKey] = useState(0);
  const registration = useEventRegistration();

  const retry = useCallback(() => setRequestKey((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetchEventCollection({ mosqueId, perPage: 6, signal: controller.signal })
      .then(({ events: mosqueEvents }) => setEvents(mosqueEvents))
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message || translate("event.mosqueSection.loadError"));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [mosqueId, requestKey]);

  const upcomingEvents = useMemo(
    () => filterEvents(events, { upcomingOnly: true }),
    [events],
  );

  return (
    <div className="card mc-card mc-mosque-events">
      <div className="card-body">
        <h5 className="fw-bold mb-3">
          <CalendarDays size={18} className="text-mc me-2" aria-hidden="true" />{t("event.mosqueSection.title")}
        </h5>
        <EventRegistrationFeedback feedback={registration.feedback} onDismiss={registration.clearFeedback} />
        <EventList
          events={upcomingEvents}
          loading={loading}
          error={error}
          onRetry={retry}
          onRegister={registration.register}
          onUnregister={registration.unregister}
          registeredEventIds={registration.registeredEventIds}
          registrationLoadingIds={registration.registrationLoadingIds}
          registrationEnabled={registration.registrationEnabled}
          emptyMessage={t("event.mosqueSection.empty")}
        />
      </div>
    </div>
  );
}
