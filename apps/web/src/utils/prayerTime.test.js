import assert from "node:assert/strict";
import test from "node:test";
import { dhuhrJamaatLabel, formatClockTime, parseClockTime } from "./prayerTime.js";

test("24-hour jamaat times parse without the old Fajr-only AM heuristic", () => {
  const dhuhr = parseClockTime("13:30", new Date(2026, 7, 21, 12, 0));
  assert.equal(dhuhr.getHours(), 13);
  assert.equal(dhuhr.getMinutes(), 30);

  const fajr = parseClockTime("04:45", new Date(2026, 7, 21));
  assert.equal(fajr.getHours(), 4);

  const maghrib = parseClockTime("18:28");
  assert.equal(maghrib.getHours(), 18);
});

test("legacy 12-hour strings and meridiem values still parse", () => {
  assert.equal(parseClockTime("1:30 PM").getHours(), 13);
  assert.equal(parseClockTime("4:55 AM").getHours(), 4);
  assert.equal(parseClockTime("invalid"), null);
});

test("dhuhr labels drop the hardcoded PM suffix", () => {
  assert.match(dhuhrJamaatLabel({ Dhuhr: "13:30" }), /Dhuhr/);
  assert.equal(dhuhrJamaatLabel({}), null);
  assert.ok(formatClockTime("13:30"));
});
