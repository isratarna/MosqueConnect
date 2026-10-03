import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEidJamaatIcs,
  eidJamaatLocation,
  eidJamaatShareText,
  googleCalendarUrl,
} from "./eidCalendar.js";

const fieldJamaat = {
  id: 7,
  eid_label: "Eid-ul-Adha",
  date: "2027-05-17",
  jamaat_time: "07:30",
  location_name: "Paltan field",
  at_mosque: false,
  latitude: 23.733,
  longitude: 90.414,
  khutbah_language: "Bangla",
  women_arrangement: true,
  notes: "Bring a prayer mat; gates open at 6:30",
  mosque: { name: "Baitul Mukarram", address: "Topkhana Rd, Dhaka" },
};

test("calendar files convert Bangladesh time to UTC and escape text", () => {
  const ics = buildEidJamaatIcs(fieldJamaat, new Date(Date.UTC(2027, 4, 1)));

  assert.match(ics, /DTSTART:20270517T013000Z\r\n/);
  assert.match(ics, /DTEND:20270517T023000Z\r\n/);
  assert.match(ics, /SUMMARY:Eid-ul-Adha jamaat – Baitul Mukarram\r\n/);
  assert.match(ics, /LOCATION:Paltan field\\, Baitul Mukarram\r\n/);
  assert.match(ics, /DESCRIPTION:Khutbah: Bangla\\nArrangements for women\\nBring a prayer mat\\; gates open at 6:30\r\n/);
  assert.match(ics, /UID:eid-jamaat-7@mosqueconnect/);
});

test("invalid dates or times produce no calendar entry", () => {
  assert.equal(buildEidJamaatIcs({ ...fieldJamaat, jamaat_time: "" }), null);
  assert.equal(googleCalendarUrl({ ...fieldJamaat, date: "soon" }), null);
});

test("google calendar links carry the UTC range", () => {
  const url = new URL(googleCalendarUrl(fieldJamaat));
  assert.equal(url.searchParams.get("dates"), "20270517T013000Z/20270517T023000Z");
  assert.equal(url.searchParams.get("location"), "Paltan field, Baitul Mukarram");
});

test("jamaats at the mosque are located by the mosque address", () => {
  const atMosque = { ...fieldJamaat, at_mosque: true, location_name: "Main hall" };
  assert.equal(eidJamaatLocation(atMosque), "Main hall, Baitul Mukarram, Topkhana Rd, Dhaka");
  assert.match(eidJamaatShareText(atMosque), /^Eid-ul-Adha jamaat – Baitul Mukarram: 2027-05-17 at 07:30, Main hall/);
});
