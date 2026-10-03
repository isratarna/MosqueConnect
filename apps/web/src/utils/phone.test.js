import assert from "node:assert/strict";
import test from "node:test";
import { bangladeshLocalNumber, bangladeshPhone, isBangladeshMobile } from "./phone.js";

test("017…, +88017… and 88017… all give the same local number", () => {
  for (const typed of ["01712345678", "+8801712345678", "8801712345678", "017 1234-5678", "1712345678"]) {
    assert.equal(bangladeshLocalNumber(typed), "1712345678");
  }
  assert.equal(bangladeshPhone("01712345678"), "+8801712345678");
});

test("only Bangladeshi mobile numbers are accepted", () => {
  assert.equal(isBangladeshMobile("1712345678"), true);
  assert.equal(isBangladeshMobile("171234567"), false);
  assert.equal(isBangladeshMobile("2712345678"), false);
});
