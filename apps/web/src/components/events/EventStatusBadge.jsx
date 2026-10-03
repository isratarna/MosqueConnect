import { useTranslation } from "react-i18next";

const KNOWN_STATUSES = ["draft", "published", "cancelled", "completed", "past"];

export default function EventStatusBadge({ status }) {
  const { t } = useTranslation();
  const normalizedStatus = KNOWN_STATUSES.includes(status) ? status : "published";

  return (
    <span className={`mc-event-status is-${normalizedStatus}`}>
      {t(`event.status.${normalizedStatus}`)}
    </span>
  );
}
