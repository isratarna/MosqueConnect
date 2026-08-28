export const NOTIFICATION_TYPES = {
  event: { label: "Event" },
  announcement: { label: "Announcement" },
  prayer_schedule: { label: "Prayer schedule" },
  campaign: { label: "Campaign" },
  system: { label: "System" },
};

export function getNotificationTypeLabel(type) {
  return NOTIFICATION_TYPES[type]?.label || "Notification";
}

export function isNotificationRead(notificationOrValue) {
  const value = typeof notificationOrValue === "object"
    ? notificationOrValue?.is_read
    : notificationOrValue;

  return value === true || value === 1 || value === "1";
}

export function normalizeNotification(notification) {
  if (!notification || typeof notification !== "object") return notification;

  return {
    ...notification,
    is_read: isNotificationRead(notification) ? 1 : 0,
  };
}

export function getNotificationPath(notification) {
  if (!notification) return null;

  const referenceId = notification.reference_id;
  const mosqueId = notification.mosque_id || notification.mosque?.id;

  switch (notification.type) {
    case "event":
      return referenceId ? `/community/events/${encodeURIComponent(referenceId)}` : null;
    case "announcement":
      return referenceId ? `/community/announcements/${encodeURIComponent(referenceId)}` : null;
    case "campaign":
      return referenceId ? `/campaigns/${encodeURIComponent(referenceId)}` : null;
    case "prayer_schedule":
      return mosqueId ? `/mosque/${encodeURIComponent(mosqueId)}#prayer-schedule` : null;
    default:
      return null;
  }
}

export function formatNotificationTime(value, now = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const current = now instanceof Date ? now : new Date(now);

  if (Number.isNaN(date.getTime()) || Number.isNaN(current.getTime())) return "";

  const seconds = Math.round((date.getTime() - current.getTime()) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absoluteSeconds < 45) return "Just now";
  if (absoluteSeconds < 60 * 60) return formatter.format(Math.round(seconds / 60), "minute");
  if (absoluteSeconds < 24 * 60 * 60) return formatter.format(Math.round(seconds / 3600), "hour");
  if (absoluteSeconds < 7 * 24 * 60 * 60) return formatter.format(Math.round(seconds / 86400), "day");

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === current.getFullYear() ? undefined : "numeric",
  }).format(date);
}
