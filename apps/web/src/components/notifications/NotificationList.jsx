import {
  BellOff,
  Building2,
  CalendarDays,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Info,
  LoaderCircle,
  Megaphone,
  Moon,
  PencilLine,
  UsersRound,
} from "lucide-react";
import { useLocale } from "../../hooks/useLocale";
import {
  formatNotificationTime,
  getNotificationTypeKey,
  isNotificationRead,
} from "../../utils/notificationUtils";

const TYPE_ICONS = {
  event: CalendarDays,
  announcement: Megaphone,
  prayer_schedule: Clock3,
  campaign: CircleDollarSign,
  eid: Moon,
  team: UsersRound,
  suggestion: PencilLine,
  system: Info,
};

export function NotificationTypeIcon({ type, size = 17 }) {
  const Icon = TYPE_ICONS[type] || Info;
  return <Icon size={size} aria-hidden="true" />;
}

export default function NotificationList({
  notifications = [],
  loading = false,
  error = "",
  onRetry,
  onSelect,
  compact = false,
}) {
  const { t, locale } = useLocale();

  if (loading) {
    return (
      <div className={`mc-notification-state${compact ? " is-compact" : ""}`} role="status">
        <LoaderCircle className="mc-event-state__spinner" size={24} aria-hidden="true" />
        <span>{t("notification.listLoading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`mc-notification-state is-error${compact ? " is-compact" : ""}`} role="alert">
        <CircleAlert size={24} aria-hidden="true" />
        <strong>{t("notification.listErrorTitle")}</strong>
        <span>{error}</span>
        {onRetry && <button type="button" className="btn btn-outline-mc btn-sm" onClick={onRetry}>{t("common.tryAgain")}</button>}
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className={`mc-notification-state${compact ? " is-compact" : ""}`}>
        <BellOff size={26} aria-hidden="true" />
        <strong>{t("notification.caughtUp")}</strong>
        <span>{t("notification.caughtUpCopy")}</span>
      </div>
    );
  }

  return (
    <div className={`mc-notification-list${compact ? " is-compact" : ""}`}>
      {notifications.map((notification) => {
        const isRead = isNotificationRead(notification);

        return (
          <button
            type="button"
            className={`mc-notification-item${isRead ? " is-read" : " is-unread"}`}
            onClick={() => onSelect?.(notification)}
            key={notification.id}
          >
            <span className="mc-notification-item__icon">
              <NotificationTypeIcon type={notification.type} />
            </span>
            <span className="mc-notification-item__content">
              <span className="mc-notification-item__meta">
                <span>{t(getNotificationTypeKey(notification.type))}</span>
                {!isRead && <span className="mc-notification-item__dot"><span className="visually-hidden">{t("notification.unread")}</span></span>}
              </span>
              <strong>{notification.title}</strong>
              {notification.message && <span className="mc-notification-item__message">{notification.message}</span>}
              <span className="mc-notification-item__details">
                {notification.mosque?.name && <span><Building2 size={13} aria-hidden="true" />{notification.mosque.name}</span>}
                <time dateTime={notification.created_at}>{formatNotificationTime(notification.created_at, new Date(), { locale, justNow: t("notification.justNow") })}</time>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
