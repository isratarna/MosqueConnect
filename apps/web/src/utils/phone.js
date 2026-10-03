/**
 * The 10-digit local part of a Bangladeshi mobile number, from whatever the user typed:
 * 017…, +88017… and 88017… all become 17… (spaces and dashes are ignored).
 */
// [Urmee · F1 Part 1] The site is for Bangladeshi mosques only (advisor), so the country-code dropdown
// is gone: 017…, +88017… and 88017… all normalise to the same local number.
export function bangladeshLocalNumber(input) {
  return String(input || "")
    .replace(/\D/g, "")
    .replace(/^880/, "")
    .replace(/^0+/, "")
    .slice(0, 10);
}

/** Bangladeshi mobile numbers are 01[3-9] followed by 8 digits. */
export const isBangladeshMobile = (local) => /^1[3-9]\d{8}$/.test(local);

/** E.164 form the API expects, e.g. +8801712345678. */
export const bangladeshPhone = (input) => `+880${bangladeshLocalNumber(input)}`;
