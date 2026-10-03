import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CAMPAIGN_CATEGORY_KEYS, EVENT_CATEGORY_KEYS, STATUS_VALUES, VERIFICATION_VALUES } from "../utils/labels.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, "..");
const load = (language) => JSON.parse(fs.readFileSync(path.join(here, "locales", `${language}.json`), "utf8"));

const en = load("en");
const bn = load("bn");

// { "nav.home": "Home", ... }
function flatten(object, prefix = "") {
  const entries = {};
  for (const [key, value] of Object.entries(object)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") Object.assign(entries, flatten(value, full));
    else entries[full] = value;
  }
  return entries;
}

const enFlat = flatten(en);
const bnFlat = flatten(bn);
const enKeys = Object.keys(enFlat);
const bnKeys = Object.keys(bnFlat);

test("bn.json contains every key in en.json", () => {
  const missing = enKeys.filter((key) => !(key in bnFlat));
  assert.deepEqual(missing, [], `Missing from bn.json:\n  ${missing.join("\n  ")}`);
});

test("bn.json has no keys that en.json lacks", () => {
  const extra = bnKeys.filter((key) => !(key in enFlat));
  assert.deepEqual(extra, [], `Only in bn.json:\n  ${extra.join("\n  ")}`);
});

test("every translation is a non-empty string", () => {
  for (const [language, flat] of [["en", enFlat], ["bn", bnFlat]]) {
    const bad = Object.entries(flat).filter(([, value]) => typeof value !== "string" || value.trim() === "");
    assert.deepEqual(bad.map(([key]) => key), [], `${language}.json has empty or non-string values`);
  }
});

// Names inside {{...}} (ignoring any format such as ", number") and any <tag>
// markers used by <Trans>. Both languages must expose the same ones, otherwise
// a value or a link silently disappears in one of them.
function placeholders(text) {
  const names = [...text.matchAll(/\{\{\s*([A-Za-z0-9_]+)/g)].map((match) => match[1]);
  const tags = [...text.matchAll(/<\/?([A-Za-z][A-Za-z0-9]*)>/g)].map((match) => match[1]);
  return [...new Set([...names, ...tags.map((tag) => `<${tag}>`)])].sort();
}

test("placeholders and markup match between en.json and bn.json", () => {
  const mismatches = enKeys
    .filter((key) => key in bnFlat)
    .filter((key) => JSON.stringify(placeholders(enFlat[key])) !== JSON.stringify(placeholders(bnFlat[key])))
    .map((key) => `${key}: en ${JSON.stringify(placeholders(enFlat[key]))} vs bn ${JSON.stringify(placeholders(bnFlat[key]))}`);

  assert.deepEqual(mismatches, [], mismatches.join("\n"));
});

test("plural keys define both forms in both languages", () => {
  for (const [language, keys] of [["en", enKeys], ["bn", bnKeys]]) {
    const incomplete = keys
      .filter((key) => key.endsWith("_one") || key.endsWith("_other"))
      .map((key) => key.replace(/_(one|other)$/, ""))
      .filter((base, index, all) => all.indexOf(base) === index)
      .filter((base) => !keys.includes(`${base}_one`) || !keys.includes(`${base}_other`));

    assert.deepEqual(incomplete, [], `${language}.json plural keys missing a form`);
  }
});

// ---------------------------------------------------------------------------
// Every key the source refers to must exist, so a typo never reaches the screen
// as a raw key or a console warning.

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "locales" ? [] : sourceFiles(full);
    return /\.(jsx?|mjs)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

const namespaces = Object.keys(en);
const KEY_SHAPE = new RegExp(`^(?:${namespaces.join("|")})\\.[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)*$`);

function keysReferencedIn(file) {
  // Comments can quote keys or values ("claim.approved"); only code counts.
  const text = fs.readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const found = new Set();

  // t("a.b"), translate("a.b"), i18nKey="a.b"
  for (const match of text.matchAll(/\b(?:t|translate)\(\s*["']([^"'$`]+)["']/g)) found.add(match[1]);
  for (const match of text.matchAll(/i18nKey=["']([^"']+)["']/g)) found.add(match[1]);
  // Keys stored in data files and tables: any string that is shaped like a
  // namespaced key, e.g. { labelKey: "facility.wudu" }.
  for (const match of text.matchAll(/["']([A-Za-z0-9_.]+)["']/g)) {
    if (KEY_SHAPE.test(match[1]) && !/\.(png|jpe?g|svg|json|css|jsx?|webp|ico)$/i.test(match[1])) found.add(match[1]);
  }

  return found;
}

const referenced = new Map();
for (const file of sourceFiles(srcRoot)) {
  for (const key of keysReferencedIn(file)) {
    if (!referenced.has(key)) referenced.set(key, []);
    referenced.get(key).push(path.relative(srcRoot, file));
  }
}

// A key exists as a leaf, as a plural pair, or as a namespace prefix (passed to
// helpers such as enumLabel(t, "superAdmin.roles", ...)).
function keyExists(flat, key) {
  return key in flat
    || `${key}_one` in flat
    || `${key}_other` in flat
    || Object.keys(flat).some((candidate) => candidate.startsWith(`${key}.`));
}

test("every translation key used in the source exists in en.json and bn.json", () => {
  const problems = [];
  for (const [key, files] of referenced) {
    if (!keyExists(enFlat, key)) problems.push(`en.json is missing "${key}" (used in ${files.join(", ")})`);
    else if (!keyExists(bnFlat, key)) problems.push(`bn.json is missing "${key}" (used in ${files.join(", ")})`);
  }
  assert.deepEqual(problems, [], problems.join("\n"));
});

// ---------------------------------------------------------------------------
// Keys built at run time (t(`status.${value}`)) cannot be found by scanning, so
// the value sets they draw from are listed here. They mirror the backend enums
// (apps/api/database/migrations) and the constants in the source.

function constantsFrom(file, exportName) {
  const text = fs.readFileSync(path.join(srcRoot, file), "utf8");
  const block = new RegExp(`export const ${exportName} = \\[([\\s\\S]*?)\\];`).exec(text);
  assert.ok(block, `${exportName} not found in ${file}`);
  return [...block[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
}

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// Keys that are intentionally kept although no source file names them.
const RESERVED_KEYS = [
  "nav.admin", // part of the original nav set-up
  "prayer.jumuah", // Jumuah prayer name required by the i18n spec
];

const DYNAMIC_FAMILIES = {
  "status": STATUS_VALUES,
  "verification": VERIFICATION_VALUES,
  "urgency": ["low", "medium", "high", "critical", "urgent", "important", "normal"],
  "geo": ["unsupported", "denied", "unavailable", "timeout", "unknown"],
  "campaign.categories": CAMPAIGN_CATEGORY_KEYS,
  "campaign.action.methods": ["mobile_banking", "bank_transfer", "cash", "other"],
  "event.categories": EVENT_CATEGORY_KEYS,
  "event.status": ["draft", "published", "cancelled", "completed", "past"],
  "profile.empty": ["activity", "claims", "donations", "invites", "suggestions", "feedback", "lostfound"],
  "prayer": ["fajr", "dhuhr", "asr", "maghrib", "isha", "jumuah", "jummah"],
  "superAdmin.roles": ["normal_user", "mosque_admin", "super_admin"],
  // [Urmee · F9] Announcement categories (editor, list filter, public pages) and the status chip states.
  "announcement.categories": ["general", "janazah", "jumuah", "eid", "ramadan", "donation_request", "event", "other"],
  "announcementEditor.state": ["draft", "scheduled", "published", "expired"],
  "superAdmin.auditModels": ["mosque", "prayer_time", "jumuah_session", "announcement", "event", "campaign", "campaign_donation", "volunteer_opportunity"],
  "superAdmin.auditEvents": ["created", "updated", "deleted"],
  "superAdmin.actions": ["claim_approved", "claim_information_requested", "claim_rejected", "content_moderated", "mosque_verification_updated", "report_updated", "settings_updated", "user_updated"],
  "superAdmin.moderation.types": ["announcement", "event", "campaign", "review"],
  "superAdmin.reports.targets": ["announcement", "event", "campaign", "mosque", "review"],
  "superAdmin.reports.categories": ["inaccurate", "inappropriate", "fraud", "safety", "spam", "other"],
  "superAdmin.statistics.content": ["announcements", "events", "campaigns"],
  "superAdmin.settings": ["claims_enabled", "reports_enabled", "auto_publish_verified_mosques"],
};

// The value lists above must not drift from the code and database they mirror.
test("category lists match the constants and backend enums they mirror", () => {
  assert.deepEqual(
    constantsFrom("utils/campaignApi.js", "CAMPAIGN_CATEGORIES").map(slug),
    CAMPAIGN_CATEGORY_KEYS,
  );

  const eventManager = fs.readFileSync(path.join(srcRoot, "components/admin/EventManager.jsx"), "utf8");
  const eventCategories = /const categories = \[([^\]]*)\]/.exec(eventManager)[1];
  assert.deepEqual([...eventCategories.matchAll(/"([^"]+)"/g)].map((match) => slug(match[1])), EVENT_CATEGORY_KEYS);
});

test("run-time key families are fully translated", () => {
  const missing = [];
  for (const [family, values] of Object.entries(DYNAMIC_FAMILIES)) {
    for (const value of values) {
      for (const [language, flat] of [["en", enFlat], ["bn", bnFlat]]) {
        if (!(`${family}.${value}` in flat)) missing.push(`${language}.json is missing "${family}.${value}"`);
      }
    }
  }
  assert.deepEqual(missing, [], missing.join("\n"));
});

test("no translation key is left unused", () => {
  const used = new Set([...referenced.keys(), ...RESERVED_KEYS]);
  for (const [family, values] of Object.entries(DYNAMIC_FAMILIES)) values.forEach((value) => used.add(`${family}.${value}`));

  const unused = enKeys
    .map((key) => key.replace(/_(one|other)$/, ""))
    .filter((key, index, all) => all.indexOf(key) === index)
    .filter((key) => !used.has(key));

  assert.deepEqual(unused, [], `Unused keys (delete them, or reference them):\n  ${unused.join("\n  ")}`);
});
