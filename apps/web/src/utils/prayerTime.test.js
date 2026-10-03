import assert from "node:assert/strict";
import test from "node:test";
import { dhuhrJamaatLabel, formatClockTime, isEstimatedPrayer, nextJamaat, parseClockTime } from "./prayerTime.js";

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

test("only calculated prayers are reported as estimated", () => {
  const sources = { Fajr: "mosque", Dhuhr: "calculated" };
  assert.equal(isEstimatedPrayer(sources, "Dhuhr"), true);
  assert.equal(isEstimatedPrayer(sources, "Fajr"), false);
  assert.equal(isEstimatedPrayer(undefined, "Asr"), false);
});

test("nextJamaat picks the next time today, then tomorrow's first", () => {
  const schedule = [
    { label: "Fajr", jamaat_time: "05:00" },
    { label: "Dhuhr", jamaat_time: "13:15" },
    { label: "Asr", jamaat_time: "16:30" },
    { label: "Broken", jamaat_time: "soon" },
  ];
  assert.deepEqual(nextJamaat(schedule, new Date(2026, 0, 1, 12, 0)), { label: "Dhuhr", time: "13:15", tomorrow: false });
  assert.deepEqual(nextJamaat(schedule, new Date(2026, 0, 1, 20, 0)), { label: "Fajr", time: "05:00", tomorrow: true });
  assert.equal(nextJamaat([], new Date()), null);
});
