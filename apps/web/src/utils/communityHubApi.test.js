import { test } from "node:test";
import assert from "node:assert/strict";
import { COMPLAINT_CATEGORIES, impactStatsFrom, labelOf, LOST_FOUND_CATEGORIES, lostFoundQuery } from "./communityHubFormat.js";

test("lostFoundQuery leaves out empty filters", () => {
  assert.equal(lostFoundQuery({}), "");
  assert.equal(lostFoundQuery({ type: "lost", category: "", mosque_id: null, page: 2 }), "?type=lost&page=2");
});

test("labelOf finds labels and falls back to the key", () => {
  assert.equal(labelOf(LOST_FOUND_CATEGORIES, "keys"), "Keys");
  assert.equal(labelOf(COMPLAINT_CATEGORIES, "timing"), "Prayer timing");
  assert.equal(labelOf(LOST_FOUND_CATEGORIES, "unknown"), "unknown");
});

test("impactStatsFrom turns the stats API into four numeric home page tiles", () => {
  const tiles = impactStatsFrom({ mosques_count: 124, members_count: "8400", donations_confirmed_total: 2100000, volunteer_signups_count: 0 });
  assert.deepEqual(tiles.map((tile) => tile.value), [124, 8400, 2100000, 0]);
  assert.deepEqual(tiles.map((tile) => Boolean(tile.money)), [false, false, true, false]);
  assert.deepEqual(impactStatsFrom(null), []);
});

test("goods form labels map to the values the API accepts", async () => {
  const { GOODS_CONDITIONS, GOODS_DELIVERY_METHODS, goodsValueFor } = await import("./communityHubFormat.js");
  assert.equal(goodsValueFor(GOODS_CONDITIONS, "Gently Used"), "gently_used");
  assert.equal(goodsValueFor(GOODS_DELIVERY_METHODS, "Need to discuss with the mosque"), "discuss");
  assert.equal(goodsValueFor(GOODS_DELIVERY_METHODS, "Teleport"), null);
});
