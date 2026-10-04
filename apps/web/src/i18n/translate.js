import i18n from "i18next";

/**
 * Translates outside a React component (API helpers, services, hooks that build
 * messages). Inside components, prefer the `t` function from `useTranslation`,
 * which also re-renders when the language changes.
 *
 * The global i18next instance is initialised by `src/i18n/index.js`. Where that
 * has not run (plain Node unit tests), the key itself is returned.
 */
// [Urmee · VIVA] React component er baire (API error message) text translate korte translate("key"). Component e t() use kori.
export function translate(key, options) {
  return i18n.isInitialized ? i18n.t(key, options) : key;
}
