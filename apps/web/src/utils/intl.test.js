import assert from "node:assert/strict";
import test from "node:test";
import { formatApiDate, formatDateTime, formatNumber, formatPercent, intlLocale, languageOf } from "./intl.js";
import { dhuhrJamaatLabel, formatClockTime, parseClockTime } from "./prayerTime.js";
import { formatCampaignDate, formatCampaignMoney } from "./campaignFormat.js";
import { formatEventDate, formatEventTime, formatEventTimeRange } from "./eventFilters.js";
import { formatNotificationTime } from "./notificationUtils.js";

const BN = "bn-BD";
const EN = "en-BD";
const BANGLA_DIGITS = /[০-৯]/;
const ASCII_DIGITS = /[0-9]/;

test("languages and regional codes resolve to the two supported languages", () => {
  assert.equal(languageOf("bn"), "bn");
  assert.equal(languageOf("bn-BD"), "bn");
  assert.equal(languageOf("en-US"), "en");
  assert.equal(languageOf("fr"), "en");
  assert.equal(languageOf(undefined), "en");
  assert.equal(intlLocale("bn"), BN);
  assert.equal(intlLocale("en-GB"), EN);
});

test("numbers use Bangla digits in Bangla and plain digits in English", () => {
  assert.equal(formatNumber(1234, EN), "1,234");
  assert.equal(formatNumber(1234, BN), "১,২৩৪");
  assert.equal(formatNumber(0.45, BN, { style: "percent" }), "৪৫%");
  assert.equal(formatPercent(45, BN), "৪৫%");
  assert.equal(formatPercent(45, EN), "45%");
  // Values that are not numbers pass through instead of becoming "NaN".
  assert.equal(formatNumber("n/a", BN), "n/a");
  assert.equal(formatNumber(null, BN), "");
});

test("jamaat times render as ১:৩০ in Bangla while the API's 24-hour form is kept internally", () => {
  assert.match(formatClockTime("13:30", BN), /^১:৩০ দুপুর$/);
  assert.doesNotMatch(formatClockTime("13:30", BN), ASCII_DIGITS);
  assert.doesNotMatch(formatClockTime("13:30", BN), /[A-Za-z]/);
  assert.match(formatClockTime("13:30", EN), /^1:30\s?PM$/i);
  assert.equal(formatClockTime("04:55", BN), "৪:৫৫ ভোর");
  assert.equal(formatClockTime("18:33", BN), "৬:৩৩ সন্ধ্যা");

  // Parsing still works on the ASCII value the API sends.
  const parsed = parseClockTime("13:30", new Date(2026, 7, 21));
  assert.equal(parsed.getHours(), 13);
  assert.equal(parsed.getMinutes(), 30);

  // Anything unparseable is shown as given.
  assert.equal(formatClockTime("soon", BN), "soon");
});

test("the Dhuhr label takes the translated prayer name", () => {
  assert.equal(dhuhrJamaatLabel({ Dhuhr: "13:30" }, BN, "যোহর"), "যোহর ১:৩০ দুপুর");
  assert.match(dhuhrJamaatLabel({ Dhuhr: "13:30" }, EN), /^Dhuhr 1:30/);
  assert.equal(dhuhrJamaatLabel({}, BN, "যোহর"), null);
});

test("campaign money and dates follow the locale", () => {
  assert.match(formatCampaignMoney(12500, "BDT", BN), /১২,৫০০/);
  assert.doesNotMatch(formatCampaignMoney(12500, "BDT", BN), ASCII_DIGITS);
  assert.match(formatCampaignMoney(12500, "BDT", EN), /12,500/);

  assert.match(formatCampaignDate("2026-08-25", BN), /২৫/);
  assert.doesNotMatch(formatCampaignDate("2026-08-25", BN), ASCII_DIGITS);
  assert.equal(formatCampaignDate("bad", BN, "উল্লেখ করা হয়নি"), "উল্লেখ করা হয়নি");
  assert.equal(formatCampaignDate("", EN), "Not specified");
});

test("event dates and times follow the locale", () => {
  assert.match(formatEventDate("2026-08-25", { locale: BN }), BANGLA_DIGITS);
  assert.doesNotMatch(formatEventDate("2026-08-25", { locale: BN }), ASCII_DIGITS);
  assert.equal(formatEventDate("not-a-date", { locale: BN, fallback: "পরে জানানো হবে" }), "not-a-date");
  assert.equal(formatEventDate(null, { locale: BN, fallback: "পরে জানানো হবে" }), "পরে জানানো হবে");

  assert.equal(formatEventTime("13:30", BN), "১:৩০ দুপুর");
  assert.equal(formatEventTimeRange({ start_time: "09:30", end_time: "11:00" }, BN), "৯:৩০ সকাল – ১১:০০ সকাল");
  assert.equal(formatEventTimeRange({}, BN, "সময় পরে জানানো হবে"), "সময় পরে জানানো হবে");
});

test("relative notification times are localised, including the just-now label", () => {
  const now = new Date("2026-08-21T12:00:00Z");
  assert.match(formatNotificationTime("2026-08-21T11:55:00Z", now, { locale: BN }), /৫ মিনিট/);
  assert.equal(formatNotificationTime("2026-08-21T11:59:40Z", now, { locale: BN, justNow: "এইমাত্র" }), "এইমাত্র");
  assert.equal(formatNotificationTime("2026-08-21T11:59:40Z", now), "Just now");
});

test("date-times name the part of the day in Bangla and use AM/PM in English", () => {
  const evening = new Date(2026, 8, 5, 19, 55);
  assert.equal(formatDateTime(evening, BN), "৫ সেপ, ২০২৬, ৭:৫৫ সন্ধ্যা");
  assert.match(formatDateTime(evening, EN), /Sep 5, 2026.*7:55\s?PM/i);
  assert.equal(formatDateTime("", BN), "");
  assert.equal(formatDateTime("garbage", BN), "");
});

test("API dates render in the active locale and fall back to the original text", () => {
  assert.match(formatApiDate("2026-07-10", BN), /১০/);
  assert.doesNotMatch(formatApiDate("2026-07-10", BN), ASCII_DIGITS);
  assert.match(formatApiDate("2026-07-10T08:00:00Z", BN), BANGLA_DIGITS);
  assert.equal(formatApiDate("", BN), "");
  assert.equal(formatApiDate("garbage", BN), "garbage");
});
