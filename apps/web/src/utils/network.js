import { translate } from "../i18n/translate.js";

/**
 * fetch() that reports a failed connection (offline, server down, blocked) in the
 * active language. Browsers word that failure themselves ("Failed to fetch",
 * "Load failed") and always in English. Aborted requests pass through unchanged,
 * because callers use AbortError to ignore them.
 */
export async function networkFetch(...args) {
  try {
    return await fetch(...args);
  } catch (error) {
    if (error?.name === "AbortError") throw error;

    const wrapped = new Error(translate("error.network"));
    wrapped.name = "NetworkError";
    wrapped.cause = error;
    throw wrapped;
  }
}
