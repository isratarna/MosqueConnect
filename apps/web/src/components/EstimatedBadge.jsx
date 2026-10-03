import { useLocale } from "../hooks/useLocale";
// Marks a prayer time the mosque has not published, calculated from its location instead.
// [Urmee · i18n dashboard] Text and tooltip come from the locale files.
export default function EstimatedBadge({ className = "" }) {
  const { t } = useLocale();
  return (
    <span
      className={`mc-estimated ${className}`.trim()}
      title={t("prayer.estimatedTitle")}
    >
      {t("prayer.estimatedShort")}
    </span>
  );
}
