import assert from "node:assert/strict";
import test from "node:test";
import { compassPoint, headingFromEvent, qiblaBearing } from "./qibla.js";

test("Qibla from Dhaka points west-north-west", () => {
  const bearing = qiblaBearing(23.8103, 90.4125);
  assert.ok(bearing > 270 && bearing < 285, `got ${bearing}`);
  assert.equal(compassPoint(bearing), "W");
});

test("Qibla from London points south-east and from Jakarta north-west", () => {
  assert.ok(Math.abs(qiblaBearing(51.5072, -0.1276) - 119) < 2);
  assert.ok(Math.abs(qiblaBearing(-6.2088, 106.8456) - 295) < 2);
});

test("compass heading comes from iOS or absolute Android events only", () => {
  assert.equal(headingFromEvent({ webkitCompassHeading: 90 }), 90);
  assert.equal(headingFromEvent({ absolute: true, alpha: 270 }), 90);
  assert.equal(headingFromEvent({ absolute: false, alpha: 270 }), null);
});
