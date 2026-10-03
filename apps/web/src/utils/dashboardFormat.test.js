import { test } from "node:test";
import assert from "node:assert/strict";
import { applyTemplate, dashboardSection, niceMax, percent, plotPoints, pointsToPath } from "./dashboardFormat.js";

test("dashboardSection accepts known sections and old aliases", () => {
  assert.equal(dashboardSection("insights"), "insights");
  assert.equal(dashboardSection("announce"), "announcements");
  assert.equal(dashboardSection("nope"), "overview");
  assert.equal(dashboardSection(null), "overview");
});

test("applyTemplate fills in the mosque name", () => {
  const post = applyTemplate("goods-needed", "Baitul Aman");
  assert.equal(post.title, "Goods needed");
  assert.equal(post.urgency, "low");
  assert.match(post.body, /^Baitul Aman needs/);
  assert.equal(applyTemplate("missing"), null);
});

test("niceMax rounds up to 1, 2 or 5 steps", () => {
  assert.equal(niceMax(0), 1);
  assert.equal(niceMax(7), 10);
  assert.equal(niceMax(12), 20);
  assert.equal(niceMax(45), 50);
  assert.equal(niceMax(100), 100);
});

test("plotPoints spreads values across the width on one shared scale", () => {
  const points = plotPoints([0, 5, 10], { width: 100, height: 50, max: 10 });
  assert.deepEqual(points, [{ x: 0, y: 50 }, { x: 50, y: 25 }, { x: 100, y: 0 }]);
  assert.equal(pointsToPath(points), "M0 50 L50 25 L100 0");
});

test("plotPoints handles a flat or single-value series", () => {
  assert.deepEqual(plotPoints([0, 0], { width: 10, height: 10 }), [{ x: 0, y: 10 }, { x: 10, y: 10 }]);
  assert.deepEqual(plotPoints([3], { width: 10, height: 10 }), [{ x: 5, y: 0 }]);
});

test("percent formats rates and missing values", () => {
  assert.equal(percent(75), "75%");
  assert.equal(percent(33.3), "33.3%");
  assert.equal(percent(null), "–");
});
