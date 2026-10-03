import assert from "node:assert/strict";
import test from "node:test";
import { addDays, applyTaraweeh, completeRows, dateKey, daysBetween, parseTimingsPaste, ramadanPhase, rowsForPeriod, timeLeft } from "./ramadan.js";

const period = { starts_on: "2027-02-08", ends_on: "2027-02-12" };
const timings = [
  { date: "2027-02-08", sehri_ends: "05:10", iftar: "17:55", taraweeh_time: "19:30" },
  { date: "2027-02-09", sehri_ends: "05:09", iftar: "17:56", taraweeh_time: null },
];

test("addDays and daysBetween handle month ends", () => {
  assert.equal(addDays("2027-02-28", 1), "2027-03-01");
  assert.deepEqual(daysBetween("2027-02-27", "2027-03-01"), ["2027-02-27", "2027-02-28", "2027-03-01"]);
  assert.equal(dateKey(new Date(2027, 1, 8)), "2027-02-08");
});

test("ramadanPhase counts down to Sehri, then Iftar, then tomorrow's Sehri", () => {
  const at = (h, m, day = 8) => new Date(2027, 1, day, h, m);
  assert.equal(ramadanPhase(timings, at(4, 0)).phase, "sehri");
  assert.equal(ramadanPhase(timings, at(12, 0)).phase, "iftar");
  const after = ramadanPhase(timings, at(20, 0));
  assert.equal(after.phase, "sehri");
  assert.equal(after.targetAt.getDate(), 9);
  assert.equal(ramadanPhase(timings, at(20, 0, 9)).phase, "done"); // last day of the table
});

test("timeLeft splits the remaining time", () => {
  const now = new Date(2027, 1, 8, 16, 42, 50);
  assert.deepEqual(timeLeft(new Date(2027, 1, 8, 17, 55, 0), now), { hours: 1, minutes: 12, seconds: 10 });
  assert.deepEqual(timeLeft(new Date(2027, 1, 8, 10, 0, 0), now), { hours: 0, minutes: 0, seconds: 0 });
});

test("pasting from a spreadsheet: dates, 12-hour evening times and skipped headers", () => {
  const text = "Day\tDate\tSehri\tIftar\tTaraweeh\n1\t08/02/2027\t5:10\t5:55\t7:30\n2\t09/02/2027\t5:09 AM\t5:56 PM\n";
  const { rows, problems } = parseTimingsPaste(text, period);
  assert.deepEqual(problems, []);
  assert.deepEqual(rows[0], { date: "2027-02-08", sehri_ends: "05:10", iftar: "17:55", taraweeh_time: "19:30" });
  assert.deepEqual(rows[1], { date: "2027-02-09", sehri_ends: "05:09", iftar: "17:56", taraweeh_time: null });
});

test("rows without dates start at the first day; dates outside the period are reported", () => {
  const { rows, problems } = parseTimingsPaste("5:10\t5:55\n5:09\t5:56\n2027-03-01\t5:00\t6:00", period);
  assert.deepEqual(rows.map((row) => row.date), ["2027-02-08", "2027-02-09"]);
  assert.equal(problems.length, 1);
});

test("rowsForPeriod, applyTaraweeh and completeRows", () => {
  const rows = rowsForPeriod(period, timings);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].iftar, "17:55");
  assert.equal(rows[3].iftar, "");
  assert.equal(completeRows(rows).length, 2);
  assert.ok(applyTaraweeh(rows, "20:00").every((row) => row.taraweeh_time === "20:00"));
});
