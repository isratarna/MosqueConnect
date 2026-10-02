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
  assert.equal(getNotificationPath({ type: "campaign", reference_id: 5, mosque_id: 2 }), "/campaigns/5");
  assert.equal(getNotificationPath({ type: "system" }), null);
  assert.equal(getNotificationPath({ type: "system", link: "/eid" }), "/eid");
  assert.equal(getNotificationPath({ type: "system", link: "https://example.org/x" }), "https://example.org/x");
  assert.equal(getNotificationPath({ type: "system", link: "javascript:alert(1)" }), null);
  assert.equal(getNotificationPath({ type: "system", link: "//evil.example" }), null);
  assert.equal(getNotificationPath({ type: "event" }), null);
});

test("notification timestamps are human readable", () => {
  const now = new Date("2026-08-21T12:00:00Z");
  assert.equal(formatNotificationTime("2026-08-21T11:59:40Z", now), "Just now");
  assert.match(formatNotificationTime("2026-08-21T11:55:00Z", now), /5 minutes ago/);
  assert.equal(formatNotificationTime("not-a-date", now), "");
});

test("Eid notifications open the mosque's Eid jamaat card", () => {
  assert.equal(getNotificationPath({ type: "eid", mosque_id: 4, reference_id: 9 }), "/mosque/4#eid-jamaat");
  assert.equal(getNotificationTypeLabel("eid"), "Eid");
});

test("Team and correction notifications open the matching profile tab", () => {
  assert.equal(getNotificationPath({ type: "team", mosque_id: 4, reference_id: 9 }), "/profile?tab=invites");
  assert.equal(getNotificationPath({ type: "suggestion", mosque_id: 4, reference_id: 2 }), "/profile?tab=suggestions");
  assert.equal(getNotificationTypeLabel("team"), "Mosque team");
});

test("feedback and goods donation notifications open the right page", () => {
  assert.equal(getNotificationPath({ type: "complaint", reference_id: 4 }), "/profile?tab=feedback");
  assert.equal(getNotificationPath({ type: "goods_donation", link: "/admin/dashboard?section=goods" }), "/admin/dashboard?section=goods");
  assert.equal(getNotificationPath({ type: "goods_donation" }), "/profile?tab=donations");
});
