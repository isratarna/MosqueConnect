import assert from "node:assert/strict";
import test from "node:test";
import { clampCampaignProgress, formatCampaignDate, formatCampaignMoney } from "./campaignFormat.js";

test("campaign progress is constrained for progress bars", () => {
  assert.equal(clampCampaignProgress(-2), 0);
  assert.equal(clampCampaignProgress(44.5), 44.5);
  assert.equal(clampCampaignProgress(120), 100);
});

test("campaign values receive readable formatting", () => {
  assert.match(formatCampaignMoney(12500, "BDT"), /12,500/);
  assert.notEqual(formatCampaignDate("2026-08-25"), "Not specified");
  assert.equal(formatCampaignDate("bad"), "Not specified");
});

test("compact money keeps the taka symbol", () => {
  assert.match(formatCampaignMoney(2100000, "BDT", { compact: true }), /^৳\s?2\.1M$/);
});
