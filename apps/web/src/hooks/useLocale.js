import { useTranslation } from "react-i18next";
import { intlLocale, languageOf } from "../utils/intl";

/**
 * The active language ("en" | "bn"), the matching Intl locale tag for number and
 * date formatting, and `t`. Components that format values with the helpers in
 * utils/intl should read the locale here so they re-render on a language change.
 */
// [Urmee · VIVA] Component er jonno: t (text), language (en/bn), locale (en-BD/bn-BD tarikh-shongkha format er jonno). Bhasha bodlale component abar render hoy.
export function useLocale() {
  const { t, i18n } = useTranslation();
  const language = languageOf(i18n.resolvedLanguage || i18n.language);

  return { t, language, locale: intlLocale(language) };
}
