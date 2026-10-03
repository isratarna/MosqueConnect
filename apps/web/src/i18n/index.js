import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import bn from "./locales/bn.json";

// [Urmee · VIVA] Duita bhasha: en ar bn. Default English.
export const SUPPORTED_LANGUAGES = ["en", "bn"];
export const DEFAULT_LANGUAGE = "en";
export const LANGUAGE_STORAGE_KEY = "i18nextLng";

// Keeps <html lang> and the tab title in step with the active language. The
// Bangla web font and screen-reader pronunciation both key off the attribute.
// [Urmee · VIVA] Bhasha bodlale <html lang> ar tab title bodlay (Bangla font ar screen reader er jonno dorkar).
function applyDocumentLanguage() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = i18n.resolvedLanguage === "bn" ? "bn" : "en";
  document.title = i18n.t("meta.title");
}

// Saves the choice so it survives a reload. Storage can be unavailable (private
// windows, blocked site data), in which case the choice simply lasts for the
// current visit.
// [Urmee · VIVA] Pochondo localStorage e save kori jate reload dileo thake. Storage block thakle crash kore na.
function persistLanguage() {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, i18n.resolvedLanguage || DEFAULT_LANGUAGE);
  } catch {
    // Nothing to do: the interface still switches language.
  }
}

// [Urmee · VIVA] i18next setup: dui json register, fallback English, age localStorage tarpor browser language dekhe bhasha thik kore.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
    },
    supportedLngs: SUPPORTED_LANGUAGES,
    // Regional codes such as "bn-BD" or "en-US" resolve to "bn" / "en".
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false, // React already escapes interpolated values.
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      // Persistence is handled below, in one place, with its own try/catch.
      caches: [],
    },
    // Surface a missing key in development instead of silently rendering it.
    saveMissing: Boolean(import.meta.env?.DEV),
    missingKeyHandler: (languages, namespace, key) => {
      console.warn(`[i18n] Missing translation "${key}" for ${languages.join(", ")}`);
    },
  });

applyDocumentLanguage();
// [Urmee · VIVA] Bhasha bodlalei <html lang> update ar save -- ek jaygay.
i18n.on("languageChanged", () => {
  applyDocumentLanguage();
  persistLanguage();
});

export default i18n;
