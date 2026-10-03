import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

const OPTIONS = [
  { value: "system", icon: Monitor, label: "System" },
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
];

// System | Light | Dark, as accessible icon buttons.
export default function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="mc-lang-toggle mc-theme-toggle" role="group" aria-label="Appearance">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          type="button"
          key={value}
          className={"mc-lang-toggle__option" + (preference === value ? " is-active" : "")}
          aria-pressed={preference === value}
          aria-label={label}
          title={label}
          onClick={() => setPreference(value)}
        >
          <Icon size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
