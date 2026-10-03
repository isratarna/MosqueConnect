import assert from "node:assert/strict";
import test from "node:test";
import { clampText, latestAnnouncements, linkifyParts, safeWebUrl, updatedAgoLabel, whatsappUrl } from "./mosqueProfile.js";

test("updatedAgoLabel says how fresh the times are", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  assert.equal(updatedAgoLabel("2026-10-05T01:00:00Z", now), "Updated today");
  assert.equal(updatedAgoLabel("2026-10-02T09:00:00Z", now), "Updated 3 days ago");
  assert.equal(updatedAgoLabel(null, now), "");
});

test("whatsappUrl accepts Bangladeshi numbers in any common format", () => {
  for (const typed of ["01712345678", "+8801712345678", "880 1712-345678"]) assert.equal(whatsappUrl(typed), "https://wa.me/8801712345678");
  assert.equal(whatsappUrl("12345"), null);
});

test("safeWebUrl only allows http(s)", () => {
  assert.equal(safeWebUrl("example.com"), "https://example.com/");
  assert.equal(safeWebUrl("javascript:alert(1)"), null);
});

test("linkifyParts turns URLs into links and leaves the rest as text", () => {
  const parts = linkifyParts("See https://example.com/a, then <b>x</b>");
  assert.deepEqual(parts.map((part) => part.type), ["text", "link", "text"]);
  assert.equal(parts[1].value, "https://example.com/a");
  assert.equal(parts[2].value, ", then <b>x</b>");
});

test("clampText and latestAnnouncements", () => {
  assert.equal(clampText("short", 10).clamped, false);
  assert.equal(clampText("word ".repeat(100), 50).clamped, true);
  const list = [{ id: 1, published_at: "2026-10-01" }, { id: 2, published_at: "2026-10-03" }, { id: 3, published_at: "2026-09-01", pinned: true }];
  assert.deepEqual(latestAnnouncements(list, 2).map((item) => item.id), [3, 2]);
});
