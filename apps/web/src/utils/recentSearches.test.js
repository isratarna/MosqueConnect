import assert from "node:assert/strict";
import test from "node:test";
import {
  addRecent,
  clearRecent,
  MAX_RECENT_SEARCHES,
  readRecent,
  RECENT_SEARCHES_KEY,
  saveRecent,
} from "./recentSearches.js";
import { isSearchable, nonEmptyGroups, searchPath } from "./searchGroups.js";

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: (key) => { delete data[key]; },
  };
}

const blocked = {
  getItem() { throw new DOMException("blocked", "SecurityError"); },
  setItem() { throw new DOMException("blocked", "SecurityError"); },
  removeItem() { throw new DOMException("blocked", "SecurityError"); },
};

test("recent searches are newest-first, de-duplicated ignoring case, and capped", () => {
  assert.deepEqual(addRecent(["a", "b"], "c"), ["c", "a", "b"]);
  assert.deepEqual(addRecent(["Dhaka", "b"], "dhaka"), ["dhaka", "b"]);
  assert.deepEqual(addRecent(["a"], "   "), ["a"]);
  const many = Array.from({ length: MAX_RECENT_SEARCHES + 3 }, (_, i) => `q${i}`);
  assert.equal(addRecent(many, "new").length, MAX_RECENT_SEARCHES);
});

test("recent searches round-trip through storage and survive junk data", () => {
  const storage = memoryStorage();
  assert.deepEqual(saveRecent("masjid", storage), ["masjid"]);
  assert.deepEqual(saveRecent("iftar", storage), ["iftar", "masjid"]);
  assert.deepEqual(readRecent(storage), ["iftar", "masjid"]);
  assert.deepEqual(clearRecent(storage), []);
  assert.deepEqual(readRecent(storage), []);
  assert.deepEqual(readRecent(memoryStorage({ [RECENT_SEARCHES_KEY]: "not json" })), []);
  assert.deepEqual(readRecent(memoryStorage({ [RECENT_SEARCHES_KEY]: '{"a":1}' })), []);
  assert.deepEqual(readRecent(memoryStorage({ [RECENT_SEARCHES_KEY]: '["ok", 5, null]' })), ["ok"]);
});

test("blocked storage never throws", () => {
  assert.deepEqual(readRecent(blocked), []);
  assert.deepEqual(saveRecent("x", blocked), ["x"]);
  assert.doesNotThrow(() => clearRecent(blocked));
  assert.deepEqual(readRecent(null), []);
});

test("queries need two characters and are encoded into the results path", () => {
  assert.equal(isSearchable("a"), false);
  assert.equal(isSearchable(" a "), false);
  assert.equal(isSearchable("ab"), true);
  assert.equal(searchPath(" Baitul Mukarram & co "), "/search?q=Baitul%20Mukarram%20%26%20co");
});

test("only groups with hits are listed, in display order", () => {
  const data = {
    campaigns: { total: 7, items: [{ id: 1 }] },
    mosques: { total: 2, items: [{ id: 2 }] },
    events: { total: 0, items: [] },
  };
  const groups = nonEmptyGroups(data);
  assert.deepEqual(groups.map((group) => group.key), ["mosques", "campaigns"]);
  assert.equal(groups[1].total, 7);
  assert.deepEqual(nonEmptyGroups(null), []);
});
