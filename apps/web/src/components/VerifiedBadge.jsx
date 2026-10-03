import { useTranslation } from "react-i18next";

export default function VerifiedBadge({ className = "" }) {
  const { t } = useTranslation();

  return (
    <span
      className={className}
      title={t("badge.verifiedTitle")}
      aria-label={t("badge.verified")}
      style={{ 
        marginLeft: "0.3rem",
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        lineHeight: 1
      }}
    >
      ✅
    </span>
  );
}
