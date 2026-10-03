import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon } from "lucide-react";
import { useLocale } from "../../hooks/useLocale";
import { useNow } from "../../hooks/useNow";
import { ramadanPhase, timeLeft } from "../../utils/ramadan";
import { fetchRamadan } from "../../utils/scheduleApi";

/**
 * [Urmee · F4] Home banner during Ramadan: "Iftar in 1h 12m at <nearest mosque>". It only exists while the
 * nearest mosque is in a Ramadan period; outside Ramadan nothing Ramadan-specific is drawn.
 */
export default function RamadanBanner({ mosque }) {
  const { t } = useLocale();
  const now = useNow(30_000); // a minute-level countdown is enough here
  const [timings, setTimings] = useState(null);
  // [Urmee · VIVA] Banner shudhu tokhoni dekhay jokhon sobcheye kachher mosque Ramadan period e ache. Outside Ramadan kichu dekhay na.
  const active = Boolean(mosque?.period?.is_ramadan);

  useEffect(() => {
    if (!active) { setTimings(null); return undefined; }
    const controller = new AbortController();
    fetchRamadan(mosque.id, { signal: controller.signal })
      .then((data) => setTimings(data?.timings ?? null))
      .catch(() => setTimings(null));
    return () => controller.abort();
  }, [active, mosque?.id]);

  // [Urmee · VIVA] Ramadan na hole ba time na thakle kichu render korbo na.
  if (!active || !timings) return null;
  const { phase, targetAt } = ramadanPhase(timings, now);
  if (!targetAt) return null;
  const { hours, minutes } = timeLeft(targetAt, now);
  const duration = hours > 0 ? t("prayer.remainingHoursMinutes", { hours, minutes }) : t("prayer.remainingMinutes", { minutes });

  return (
    <Link to={`/mosque/${mosque.id}#ramadan`} className="mc-ramadan-banner" role="status">
      <Moon size={18} aria-hidden="true" />
      <span>{t(phase === "iftar" ? "ramadan.bannerIftar" : "ramadan.bannerSehri", { time: duration, mosque: mosque.name })}</span>
    </Link>
  );
}
