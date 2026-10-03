import { DEFAULT_LOCALE } from "./intl.js";

// Translation keys for each notification type, resolved with t() where shown.
export const NOTIFICATION_TYPES = {
  event: { labelKey: "notification.types.event" },
  announcement: { labelKey: "notification.types.announcement" },
  prayer_schedule: { labelKey: "notification.types.prayer_schedule" },
  campaign: { labelKey: "notification.types.campaign" },
  eid: { labelKey: "notification.types.eid" },
  team: { labelKey: "notification.types.team" },
  suggestion: { labelKey: "notification.types.suggestion" },
  complaint: { labelKey: "notification.types.complaint" },
  goods_donation: { labelKey: "notification.types.goods_donation" },
  system: { labelKey: "notification.types.system" },
};

export function getNotificationTypeKey(type) {
  return NOTIFICATION_TYPES[type]?.labelKey || "notification.types.default";
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

/** A broadcast link that is a page on this site or an https URL; anything else is dropped. */
export function safeNotificationLink(link) {
  if (typeof link !== "string") return null;
  const trimmed = link.trim();
  if (/^\/(?!\/)/.test(trimmed) || /^https:\/\//i.test(trimmed)) return trimmed;
  return null;
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
    case "eid":
      return mosqueId ? `/mosque/${encodeURIComponent(mosqueId)}#eid-jamaat` : null;
    case "team":
      return "/profile?tab=invites";
    case "suggestion":
      return "/profile?tab=suggestions";
    case "complaint":
      return "/profile?tab=feedback";
    case "goods_donation":
      return safeNotificationLink(notification.link) || "/profile?tab=donations";
    case "system":
      return safeNotificationLink(notification.link);
    default:
      return null;
  }
}

export function formatNotificationTime(value, now = new Date(), { locale = DEFAULT_LOCALE, justNow = "Just now" } = {}) {
  const date = value instanceof Date ? value : new Date(value);
  const current = now instanceof Date ? now : new Date(now);

  if (Number.isNaN(date.getTime()) || Number.isNaN(current.getTime())) return "";

  const seconds = Math.round((date.getTime() - current.getTime()) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absoluteSeconds < 45) return justNow;
  if (absoluteSeconds < 60 * 60) return formatter.format(Math.round(seconds / 60), "minute");
  if (absoluteSeconds < 24 * 60 * 60) return formatter.format(Math.round(seconds / 3600), "hour");
  if (absoluteSeconds < 7 * 24 * 60 * 60) return formatter.format(Math.round(seconds / 86400), "day");

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === current.getFullYear() ? undefined : "numeric",
  }).format(date);
}
