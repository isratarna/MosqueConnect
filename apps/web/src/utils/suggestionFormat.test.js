import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPayload, communityConfirmedLabel, describeValue, initialPayload, to12Hour } from "./suggestionFormat.js";

test("to12Hour formats 24-hour clock times", () => {
  assert.equal(to12Hour("20:15"), "8:15 PM");
  assert.equal(to12Hour("00:05:00"), "12:05 AM");
  assert.equal(to12Hour("12:30"), "12:30 PM");
  assert.equal(to12Hour(""), "");
});

test("describeValue explains each kind of value for the before → after view", () => {
  assert.equal(describeValue("prayer_time", { prayer: "isha", jamaat_time: "20:15", adhan_time: "19:45" }), "Isha jamaat 8:15 PM (adhan 7:45 PM)");
  assert.equal(describeValue("prayer_time", { prayer: "fajr", jamaat_time: "05:10", source: "calculated" }), "Fajr jamaat 5:10 AM · estimated");
  assert.equal(describeValue("jumuah", { sequence: 1, label: "First Jumuah", jamaat_time: "13:30", khutbah_time: "13:00" }), "First Jumuah jamaat 1:30 PM, khutbah 1:00 PM");
  assert.equal(describeValue("address", { address: "12 Road", area: "Motijheel", district: "Dhaka" }), "12 Road, Motijheel, Dhaka");
  assert.equal(describeValue("location", { latitude: 23.7333, longitude: 90.417 }), "23.73330, 90.41700");
  assert.equal(describeValue("facilities", { facilities: ["wudu", "parking"] }), "Wudu Facility, Parking");
  assert.equal(describeValue("facilities", { facilities: [] }), "None listed");
  assert.equal(describeValue("phone", null), "Not set");
});

test("initialPayload pre-fills the form from the public profile", () => {
  const mosque = {
    phone: "+880 2-7000000",
    address: "1 Mosque Road",
    district: "Dhaka",
    lat: 23.7,
    lng: 90.4,
    facilities: ["wudu"],
    prayer_schedule: [{ prayer: "isha", label: "Isha", adhan_time: "19:45", jamaat_time: "20:00", source: "mosque" }],
    jumuah_sessions: [{ sequence: 2, label: "Second", jamaat_time: "14:00:00", khutbah_time: null }],
  };
  assert.deepEqual(initialPayload("prayer_time", mosque, { prayer: "isha" }), { prayer: "isha", jamaat_time: "20:00", adhan_time: "19:45" });
  assert.deepEqual(initialPayload("jumuah", mosque), { sequence: 2, jamaat_time: "14:00", khutbah_time: "" });
  assert.deepEqual(initialPayload("address", mosque), { address: "1 Mosque Road", district: "Dhaka", area: "" });
  assert.deepEqual(initialPayload("location", mosque), { latitude: 23.7, longitude: 90.4 });
  assert.deepEqual(initialPayload("facilities", mosque), { facilities: ["wudu"] });
  assert.deepEqual(initialPayload("other", mosque), {});
});

test("cleanPayload drops empty optional values and keeps an empty facility list", () => {
  assert.deepEqual(cleanPayload("prayer_time", { prayer: "isha", jamaat_time: "20:15", adhan_time: "" }), { prayer: "isha", jamaat_time: "20:15" });
  assert.deepEqual(cleanPayload("location", { latitude: "23.5", longitude: "90.1" }), { latitude: 23.5, longitude: 90.1 });
  assert.deepEqual(cleanPayload("facilities", { facilities: [] }), { facilities: [] });
});

test("communityConfirmedLabel says how long ago the times were confirmed", () => {
  const now = new Date("2026-10-04T12:00:00Z");
  assert.equal(communityConfirmedLabel("2026-10-02T09:00:00Z", now), "Times confirmed by the community 2 days ago");
  assert.equal(communityConfirmedLabel("2026-10-04T08:00:00Z", now), "Times confirmed by the community today");
  assert.equal(communityConfirmedLabel("2026-10-03T08:00:00Z", now), "Times confirmed by the community yesterday");
  assert.equal(communityConfirmedLabel(null, now), "");
});
