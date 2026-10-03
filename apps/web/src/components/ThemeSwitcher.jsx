import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../hooks/useTheme";

const OPTIONS = [
  { value: "system", icon: Monitor, labelKey: "theme.system" },
  { value: "light", icon: Sun, labelKey: "theme.light" },
  { value: "dark", icon: Moon, labelKey: "theme.dark" },
];

// System | Light | Dark, as icon buttons. It reuses the segmented-control look
// of the language switcher it sits beside.
// [Urmee · VIVA] System | Light | Dark -- 3 ta icon button. Click e setPreference(value).
export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();

  return (
    <div className="mc-lang-toggle mc-theme-toggle" role="group" aria-label={t("theme.label")}>
      {OPTIONS.map(({ value, icon: Icon, labelKey }) => (
        <button
          type="button"
          key={value}
          className={"mc-lang-toggle__option" + (preference === value ? " is-active" : "")}
          aria-pressed={preference === value}
          aria-label={t(labelKey)}
          title={t(labelKey)}
          onClick={() => setPreference(value)}
        >
          <Icon size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
