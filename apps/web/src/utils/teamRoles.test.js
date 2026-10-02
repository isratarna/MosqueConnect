import { test } from "node:test";
import assert from "node:assert/strict";
import { abilitiesOf, allowedSections, canUseSection, invitableRoles, roleLabel, toInternationalPhone } from "./teamRoles.js";
import { DASHBOARD_SECTIONS } from "./dashboardFormat.js";

const ids = (sections) => sections.map((section) => section.id);

test("owners and managers see every dashboard section", () => {
  assert.deepEqual(ids(allowedSections(DASHBOARD_SECTIONS, abilitiesOf({ role: "owner" }))), ids(DASHBOARD_SECTIONS));
  assert.deepEqual(ids(allowedSections(DASHBOARD_SECTIONS, abilitiesOf({ role: "manager" }))), ids(DASHBOARD_SECTIONS));
});

test("editors see content sections but not prayer times, settings or corrections", () => {
  const sections = ids(allowedSections(DASHBOARD_SECTIONS, abilitiesOf({ role: "editor" })));
  assert.deepEqual(sections, ["overview", "insights", "announcements", "events", "donations", "volunteers", "goods", "lostfound", "team"]);
});

test("prayer-times members see only the schedule sections, corrections and team", () => {
  const sections = ids(allowedSections(DASHBOARD_SECTIONS, abilitiesOf({ role: "prayer_times" })));
  assert.deepEqual(sections, ["overview", "prayer", "jummah", "eid", "corrections", "team"]);
});

test("abilities sent by the API win over the role table", () => {
  assert.deepEqual(abilitiesOf({ role: "owner", abilities: ["view"] }), ["view"]);
  assert.deepEqual(abilitiesOf(null), []);
  assert.equal(canUseSection(["view"], "profile"), false);
  assert.equal(canUseSection(["view"], "unknown"), false);
});

test("only owners can invite another owner", () => {
  assert.ok(invitableRoles(abilitiesOf({ role: "owner" })).some((role) => role.value === "owner"));
  assert.ok(!invitableRoles(abilitiesOf({ role: "manager" })).some((role) => role.value === "owner"));
  assert.equal(roleLabel("prayer_times"), "Prayer times");
  assert.equal(roleLabel("nope"), "Member");
});

test("toInternationalPhone accepts the ways people type a phone number", () => {
  assert.equal(toInternationalPhone("01712-345678"), "+8801712345678");
  assert.equal(toInternationalPhone("+880 1712 345678"), "+8801712345678");
  assert.equal(toInternationalPhone("8801712345678"), "+8801712345678");
  assert.equal(toInternationalPhone("0044 20 7946 0958"), "+442079460958");
  assert.equal(toInternationalPhone("+1 (555) 010-0100"), "+15550100100");
  assert.equal(toInternationalPhone("  "), "");
});
