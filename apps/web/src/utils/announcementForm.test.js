// [Urmee · F9] Tests for the announcement editor helpers.
import assert from "node:assert/strict";
import test from "node:test";
import { announcementState, buildAnnouncementFormData, formFromAnnouncement, fromDhakaInput, janazahBody, toDhakaInput } from "./announcementForm.js";

test("Dhaka time conversion round-trips and uses UTC+6", () => {
  assert.equal(toDhakaInput("2026-10-04T23:30:00Z"), "2026-10-05T05:30");
  assert.equal(fromDhakaInput("2026-10-05T05:30"), "2026-10-05T05:30:00+06:00");
  assert.equal(new Date(fromDhakaInput("2026-10-05T05:30")).toISOString(), "2026-10-04T23:30:00.000Z");
  assert.equal(toDhakaInput(null), "");
  assert.equal(fromDhakaInput(""), null);
});

test("announcementState derives scheduled and expired", () => {
  const now = Date.parse("2026-10-05T00:00:00Z");
  assert.equal(announcementState({ status: "draft" }, now), "draft");
  assert.equal(announcementState({ status: "scheduled" }, now), "scheduled");
  assert.equal(announcementState({ status: "published", expires_at: null }, now), "published");
  assert.equal(announcementState({ status: "published", expires_at: "2026-10-04T00:00:00Z" }, now), "expired");
  assert.equal(announcementState({ status: "published", is_expired: true }, now), "expired");
  assert.equal(announcementState({ status: "published", expires_at: "2026-10-06T00:00:00Z" }, now), "published");
});

test("janazahBody fills the name, time and place and keeps placeholders", () => {
  const text = janazahBody({ name: "Abdul Karim", time: "after Asr today", place: "Baitul Aman graveyard" }, "Baitul Aman");
  assert.match(text, /janazah of Abdul Karim will be held at Baitul Aman graveyard, after Asr today/);
  assert.match(janazahBody({}, "Baitul Aman"), /\[name\].*Baitul Aman, \[time\]/);
});

test("buildAnnouncementFormData sends Dhaka-offset dates only when scheduling", () => {
  const base = { ...formFromAnnouncement(null), title: " T ", body: " B ", is_pinned: true, expires_at: "2026-10-10T08:00" };
  const now = buildAnnouncementFormData({ ...base, mode: "now", publish_at: "2026-10-05T05:30" });
  assert.equal(now.get("status"), "published");
  assert.equal(now.get("publish_at"), "");
  assert.equal(now.get("title"), "T");
  assert.equal(now.get("is_pinned"), "1");
  assert.equal(now.get("expires_at"), "2026-10-10T08:00:00+06:00");
  const later = buildAnnouncementFormData({ ...base, mode: "schedule", publish_at: "2026-10-05T05:30" });
  assert.equal(later.get("publish_at"), "2026-10-05T05:30:00+06:00");
  assert.equal(buildAnnouncementFormData({ ...base, mode: "draft" }).get("status"), "draft");
});

test("formFromAnnouncement maps a scheduled item back into the editor", () => {
  const form = formFromAnnouncement({ title: "x", body: "y", status: "scheduled", publish_at: "2026-10-04T23:30:00Z", expires_at: null, is_pinned: true, category: "janazah", urgency: "high" });
  assert.equal(form.mode, "schedule");
  assert.equal(form.publish_at, "2026-10-05T05:30");
  assert.equal(form.expires_at, "");
  assert.equal(form.category, "janazah");
});
