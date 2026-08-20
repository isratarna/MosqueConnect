import test from "node:test";
import assert from "node:assert/strict";
import {
  filterEvents,
  getEventDisplayStatus,
  isEventPast,
} from "./eventFilters.js";

const NOW = new Date(2026, 7, 20, 12, 0, 0);
const EVENTS = [
  {
    id: 1,
    title: "Family Quran Night",
    mosque: { name: "Central Community Mosque" },
    category: "Quran Program",
    event_date: "2026-08-21",
    start_time: "18:00",
    location: "Main prayer hall, Dhanmondi",
    status: "published",
  },
  {
    id: 2,
    title: "Volunteer Food Drive",
    mosque: { name: "North Mosque" },
    category: "Volunteer Activity",
    event_date: "2026-08-10",
    start_time: "09:00",
    location: "Community centre, Uttara",
    status: "published",
  },
];

test("event discovery search covers title, mosque, category, and location", () => {
  assert.deepEqual(filterEvents(EVENTS, { search: "quran" }, NOW).map(({ id }) => id), [1]);
  assert.deepEqual(filterEvents(EVENTS, { search: "central community" }, NOW).map(({ id }) => id), [1]);
  assert.deepEqual(filterEvents(EVENTS, { search: "volunteer activity" }, NOW).map(({ id }) => id), [2]);
  assert.deepEqual(filterEvents(EVENTS, { search: "uttara" }, NOW).map(({ id }) => id), [2]);
});

test("event discovery combines category, mosque, and upcoming filters", () => {
  const results = filterEvents(EVENTS, {
    category: "Quran Program",
    mosque: "Central Community Mosque",
    upcomingOnly: true,
  }, NOW);

  assert.deepEqual(results.map(({ id }) => id), [1]);
});

test("date filters distinguish today, this week, and past events", () => {
  const todayEvent = { ...EVENTS[0], id: 3, event_date: "2026-08-20", start_time: "18:00" };
  const collection = [...EVENTS, todayEvent];

  assert.deepEqual(filterEvents(collection, { dateGroup: "today" }, NOW).map(({ id }) => id), [3]);
  assert.deepEqual(filterEvents(collection, { dateGroup: "this-week" }, NOW).map(({ id }) => id), [1, 3]);
  assert.equal(isEventPast(EVENTS[1], NOW), true);
  assert.equal(getEventDisplayStatus(EVENTS[1], NOW), "past");
});

test("cancelled event status takes precedence over its date", () => {
  const cancelled = { ...EVENTS[0], status: "cancelled" };
  assert.equal(getEventDisplayStatus(cancelled, NOW), "cancelled");
});
