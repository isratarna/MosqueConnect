import assert from "node:assert/strict";
import test from "node:test";
import {
  formatNotificationTime,
  getNotificationPath,
  getNotificationTypeLabel,
  isNotificationRead,
  normalizeNotification,
} from "./notificationUtils.js";

test("notification types use the supported labels", () => {
  assert.equal(getNotificationTypeLabel("event"), "Event");
  assert.equal(getNotificationTypeLabel("prayer_schedule"), "Prayer schedule");
  assert.equal(getNotificationTypeLabel("unknown"), "Notification");
});

test("Laravel is_read values are normalized consistently", () => {
  assert.equal(isNotificationRead({ is_read: 1 }), true);
  assert.equal(isNotificationRead({ is_read: 0 }), false);
  assert.equal(isNotificationRead({ is_read: "1" }), true);
  assert.equal(isNotificationRead({ is_read: "0" }), false);
  assert.equal(isNotificationRead({ is_read: true }), true);
  assert.equal(isNotificationRead({ is_read: false }), false);
  assert.equal(normalizeNotification({ id: 3, is_read: "1" }).is_read, 1);
  assert.equal(normalizeNotification({ id: 4, is_read: "0" }).is_read, 0);
});

test("notification destinations reuse existing frontend routes", () => {
  assert.equal(getNotificationPath({ type: "event", reference_id: 12 }), "/community/events/12");
  assert.equal(getNotificationPath({ type: "announcement", reference_id: 8 }), "/community/announcements/8");
  assert.equal(getNotificationPath({ type: "prayer_schedule", mosque_id: 3 }), "/mosque/3#prayer-schedule");
  assert.equal(getNotificationPath({ type: "campaign", reference_id: 5, mosque_id: 2 }), "/support?type=money&campaign=5&mosque=2");
  assert.equal(getNotificationPath({ type: "system" }), null);
  assert.equal(getNotificationPath({ type: "event" }), null);
});

test("notification timestamps are human readable", () => {
  const now = new Date("2026-08-21T12:00:00Z");
  assert.equal(formatNotificationTime("2026-08-21T11:59:40Z", now), "Just now");
  assert.match(formatNotificationTime("2026-08-21T11:55:00Z", now), /5 minutes ago/);
  assert.equal(formatNotificationTime("not-a-date", now), "");
});
