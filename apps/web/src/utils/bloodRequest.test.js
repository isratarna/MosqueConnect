import assert from "node:assert/strict";
import test from "node:test";
import { filterBloodRequests, normalizeBloodRequest, shareOnWhatsAppUrl, telHref } from "./bloodRequest.js";

const base = (over) => normalizeBloodRequest({ id: 1, blood_group: "O+", hospital_or_location: "Dhaka Medical", required_date: "2026-10-10", urgency: "normal", status: "active", ...over });

test("critical requests sort first, then the soonest date", () => {
  const list = [base({ id: 1 }), base({ id: 2, urgency: "critical", required_date: "2026-10-20" }), base({ id: 3, required_date: "2026-10-05" })];
  assert.deepEqual(filterBloodRequests(list).map((r) => r.id), [2, 3, 1]);
});

test("filters by group, urgency, area text and needed-by date", () => {
  const list = [base({ id: 1 }), base({ id: 2, blood_group: "A+", hospital_or_location: "Square Hospital", urgency: "high" })];
  assert.deepEqual(filterBloodRequests(list, { group: "A+" }).map((r) => r.id), [2]);
  assert.deepEqual(filterBloodRequests(list, { urgent: true }).map((r) => r.id), [2]);
  assert.deepEqual(filterBloodRequests(list, { area: "dhaka" }).map((r) => r.id), [1]);
  assert.deepEqual(filterBloodRequests(list, { by: "2026-10-09" }).map((r) => r.id), []);
});

test("share and call links", () => {
  const url = shareOnWhatsAppUrl(base({ urgency: "critical", units: 2 }), "https://x.test/blood-donation/1");
  assert.match(decodeURIComponent(url), /URGENT: O\+ blood needed/);
  assert.match(decodeURIComponent(url), /https:\/\/x\.test\/blood-donation\/1/);
  assert.equal(telHref("01711 223344"), "tel:01711223344");
});
