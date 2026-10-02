import test from "node:test";
import assert from "node:assert/strict";
import {
  aiReview,
  aiScoreBadge,
  broadcastAudienceLabel,
  cleanFilters,
  describeContent,
  dismissKey,
  isSafeBroadcastLink,
  previewKind,
} from "./adminConsole.js";

test("dismissKey is stable per notice and changes with the text", () => {
  assert.equal(dismissKey("Maintenance tonight"), dismissKey("Maintenance tonight"));
  assert.notEqual(dismissKey("Maintenance tonight"), dismissKey("Maintenance tomorrow"));
  assert.match(dismissKey("x"), /^mc-maintenance-dismissed:/);
});

test("aiScoreBadge buckets scores and ignores missing ones", () => {
  assert.deepEqual(aiScoreBadge(0.82), { label: "Strong match", tone: "success", percent: 82 });
  assert.deepEqual(aiScoreBadge("0.55"), { label: "Partial match", tone: "warning", percent: 55 });
  assert.deepEqual(aiScoreBadge(0), { label: "Weak match", tone: "danger", percent: 0 });
  assert.equal(aiScoreBadge(null), null);
  assert.equal(aiScoreBadge(""), null);
  assert.equal(aiScoreBadge("abc"), null);
  assert.equal(aiScoreBadge(1.4).percent, 100);
});

test("aiReview handles none, errors and results", () => {
  assert.deepEqual(aiReview({}), { state: "none" });
  assert.deepEqual(aiReview({ ai_result: { error: "review_failed", message: "Quota" } }), { state: "error", message: "Quota" });

  const done = aiReview({
    ai_score: "0.75",
    ai_result: { document_type: "letterhead", mentions_mosque_name: true, findings: ["a"], red_flags: ["b"], summary: "s" },
  });
  assert.equal(done.state, "done");
  assert.equal(done.badge.label, "Strong match");
  assert.equal(done.mentionsMosque, true);
  assert.equal(done.mentionsApplicant, false);
  assert.deepEqual(done.findings, ["a"]);
  assert.deepEqual(done.redFlags, ["b"]);
});

test("previewKind only previews PDFs and images", () => {
  assert.equal(previewKind("application/pdf"), "pdf");
  assert.equal(previewKind("image/PNG"), "image");
  assert.equal(previewKind("image/jpeg; charset=binary"), "image");
  assert.equal(previewKind("text/html"), null);
  assert.equal(previewKind(), null);
});

test("cleanFilters drops empty values but keeps zero and false", () => {
  assert.deepEqual(cleanFilters({ a: "", b: null, c: undefined, d: 0, e: false, f: "x" }), { d: 0, e: false, f: "x" });
});

test("broadcastAudienceLabel describes each audience", () => {
  assert.equal(broadcastAudienceLabel({ audience: "all" }), "Everyone");
  assert.equal(broadcastAudienceLabel({ audience: "role", audience_value: "mosque_admin" }), "All mosque admins");
  assert.equal(broadcastAudienceLabel({ audience: "district", audience_value: "Dhaka" }), "Followers of mosques in Dhaka");
});

test("isSafeBroadcastLink allows site paths and https only", () => {
  assert.equal(isSafeBroadcastLink(""), true);
  assert.equal(isSafeBroadcastLink("/eid"), true);
  assert.equal(isSafeBroadcastLink("https://example.org"), true);
  assert.equal(isSafeBroadcastLink("//evil.example"), false);
  assert.equal(isSafeBroadcastLink("javascript:alert(1)"), false);
  assert.equal(isSafeBroadcastLink("http://example.org"), false);
});

test("describeContent pluralises and skips zeros", () => {
  assert.equal(describeContent({ followers: 3, events: 1, claims: 0 }), "3 followers, 1 event");
  assert.equal(describeContent({}), "");
});
