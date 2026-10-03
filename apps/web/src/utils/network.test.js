import assert from "node:assert/strict";
import test from "node:test";
import { networkFetch } from "./network.js";

function withFetch(implementation, body) {
  const original = globalThis.fetch;
  globalThis.fetch = implementation;
  return Promise.resolve(body()).finally(() => {
    globalThis.fetch = original;
  });
}

test("a response is returned untouched", async () => {
  const response = { ok: true };
  await withFetch(async () => response, async () => {
    assert.equal(await networkFetch("/api/x"), response);
  });
});

test("a failed connection becomes a NetworkError instead of the browser's English text", async () => {
  await withFetch(async () => { throw new TypeError("Failed to fetch"); }, async () => {
    await assert.rejects(() => networkFetch("/api/x"), (error) => {
      assert.equal(error.name, "NetworkError");
      assert.notEqual(error.message, "Failed to fetch");
      assert.ok(error.cause instanceof TypeError);
      return true;
    });
  });
});

test("an aborted request keeps its AbortError so callers can ignore it", async () => {
  const abort = new DOMException("Aborted", "AbortError");
  await withFetch(async () => { throw abort; }, async () => {
    await assert.rejects(() => networkFetch("/api/x"), (error) => error === abort);
  });
});
