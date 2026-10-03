import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyTheme,
  normalizePreference,
  readPreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writePreference,
} from "./theme.js";

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
  };
}

const brokenStorage = {
  getItem() { throw new DOMException("blocked", "SecurityError"); },
  setItem() { throw new DOMException("blocked", "SecurityError"); },
};

test("only system, light and dark are accepted; anything else means system", () => {
  assert.equal(normalizePreference("dark"), "dark");
  assert.equal(normalizePreference("light"), "light");
  assert.equal(normalizePreference("system"), "system");
  assert.equal(normalizePreference("sepia"), "system");
  assert.equal(normalizePreference(null), "system");
});

test("system follows the operating system; light and dark ignore it", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("nonsense", true), "dark");
});

test("the preference round-trips through storage", () => {
  const storage = memoryStorage();
  assert.equal(readPreference(storage), "system");
  writePreference(storage, "dark");
  assert.equal(storage.data[THEME_STORAGE_KEY], "dark");
  assert.equal(readPreference(storage), "dark");
  writePreference(storage, "bogus");
  assert.equal(readPreference(storage), "system");
});

test("blocked or missing storage never throws", () => {
  assert.equal(readPreference(brokenStorage), "system");
  assert.doesNotThrow(() => writePreference(brokenStorage, "dark"));
  assert.equal(readPreference(null), "system");
  assert.doesNotThrow(() => writePreference(null, "dark"));
});

test("applyTheme sets the Bootstrap attribute and the colour scheme", () => {
  const attributes = {};
  const root = { setAttribute: (name, value) => { attributes[name] = value; }, style: {} };
  applyTheme(root, "dark");
  assert.equal(attributes["data-bs-theme"], "dark");
  assert.equal(root.style.colorScheme, "dark");
});

test("the inline script in index.html uses the same storage key as the app", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const html = fs.readFileSync(path.resolve(here, "../../index.html"), "utf8");
  assert.ok(html.includes(`getItem("${THEME_STORAGE_KEY}")`), "index.html reads a different key than utils/theme.js");
  assert.match(html, /<head>[\s\S]*<script>[\s\S]*data-bs-theme[\s\S]*<\/script>[\s\S]*<\/head>/, "the theme script must be a blocking inline script in <head>");
  const firstScriptTag = /<head>[\s\S]*?(<script[^>]*>)/.exec(html)[1];
  assert.equal(firstScriptTag, "<script>", "the theme script must be a plain blocking script (no defer, async or type)");
});
