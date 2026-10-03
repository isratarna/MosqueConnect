import { useTranslation } from "react-i18next";

// Each language is labelled in its own script so it can be recognised even when
// the rest of the interface is in a language the reader cannot read yet.
const LANGUAGE_OPTIONS = [
  { code: "en", label: "EN" },
  { code: "bn", label: "বাং" },
];

// Segmented EN | বাং control. Changing the language is handled centrally in
// src/i18n/index.js, which also saves the choice and updates <html lang>.
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage === "bn" ? "bn" : "en";

  return (
    <div className="mc-lang-toggle" role="group" aria-label={t("common.toggleLanguage")}>
      {LANGUAGE_OPTIONS.map(({ code, label }) => (
        <button
          type="button"
          key={code}
          lang={code}
          className={"mc-lang-toggle__option" + (current === code ? " is-active" : "")}
          aria-pressed={current === code}
          onClick={() => current !== code && i18n.changeLanguage(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
