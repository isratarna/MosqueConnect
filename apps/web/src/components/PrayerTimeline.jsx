import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock3, Star } from "lucide-react";
import { useLocale } from "../hooks/useLocale";
import { formatClockTime, parseClockTime } from "../utils/prayerTime";
import { formatTimeOfDay } from "../utils/intl";
import EstimatedBadge from "./EstimatedBadge";

// `name` is the key the API uses for the prayer; `labelKey` is its translation.
const DAILY_PRAYERS = [
  { name: "Fajr", labelKey: "prayer.fajr" },
  { name: "Dhuhr", labelKey: "prayer.dhuhr" },
  { name: "Asr", labelKey: "prayer.asr" },
  { name: "Maghrib", labelKey: "prayer.maghrib" },
  { name: "Isha", labelKey: "prayer.isha" },
];

const STATUS_LABEL_KEYS = {
  completed: "prayer.status.completed",
  next: "prayer.status.next",
  upcoming: "prayer.status.upcoming",
};

function formatRemaining(ms, t) {
  if (ms <= 0) return t("prayer.remainingMinutes", { minutes: 0 });
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0) return t("prayer.remainingHoursMinutes", { hours, minutes });
  return t("prayer.remainingMinutes", { minutes });
}

export default function PrayerTimeline({ prayers = {}, schedule = [] }) {
  const { t, locale } = useLocale();
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const tick = () => setNowTick(Date.now());
    const untilNextMinute = 60000 - (Date.now() % 60000);
    const timer = setTimeout(() => {
      tick();
      const iv = setInterval(tick, 60000);
      (window.__mcPrayerInterval = window.__mcPrayerInterval || []).push(iv);
    }, untilNextMinute);

    return () => {
      clearTimeout(timer);
      const arr = window.__mcPrayerInterval || [];
      arr.forEach((i) => clearInterval(i));
      window.__mcPrayerInterval = [];
    };
  }, []);

  const now = new Date(nowTick);
  const scheduleByLabel = useMemo(() => {
    const map = {};
    for (const item of Array.isArray(schedule) ? schedule : []) {
      if (item?.label) map[item.label] = item;
    }
    return map;
  }, [schedule]);

  const list = useMemo(() => {
    const items = DAILY_PRAYERS.map(({ name, labelKey }) => {
      const jamaat = prayers[name];
      const details = scheduleByLabel[name];
      const dt = parseClockTime(jamaat, now);
      return {
        name,
        labelKey,
        time: jamaat ? formatClockTime(jamaat, locale) : t("common.dash"),
        adhan: details?.adhan_time ? formatClockTime(details.adhan_time, locale) : null,
        estimated: details?.source === "calculated",
        date: dt,
      };
    });

    const nextIndex = items.findIndex((it) => it.date && it.date.getTime() > now.getTime());
    if (nextIndex !== -1) {
      return items.map((it, i) => ({ ...it, status: i < nextIndex ? "completed" : i === nextIndex ? "next" : "upcoming" }));
    }

    const tomorrowFajr = parseClockTime(prayers.Fajr, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    return items.map((it) => ({
      ...it,
      status: it.name === "Fajr" ? "next" : "completed",
      date: it.name === "Fajr" ? tomorrowFajr : it.date,
    }));
  }, [prayers, scheduleByLabel, nowTick, locale, t]);

  const next = list.find((l) => l.status === "next") || list[0];
  const hasEstimated = list.some((it) => it.estimated);
  const remaining = next && next.date ? next.date.getTime() - now.getTime() : 0;

  return (
    <div className="mc-prayer-timeline">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="fw-bold">{t("prayer.today")}</div>
        <div className="mc-next-prayer text-end" aria-live="polite">
          <span>{t("prayer.next")}</span>
          <strong>{next ? `${t(next.labelKey)} ${next.date ? formatTimeOfDay(next.date, locale) : t("common.dash")}` : t("common.dash")}</strong>
          <div><small className="text-muted">{t("prayer.inTime", { time: formatRemaining(remaining, t) })}</small></div>
        </div>
      </div>

      <div className="mc-timeline-row d-flex">
        {list.map((it) => (
          <div
            key={it.name}
            className={"mc-prayer-item bg-light rounded-3 me-2 " + (it.status ? `mc-${it.status}` : "")}
            role="group"
            aria-label={t(it.estimated ? "prayer.jamaatAriaEstimated" : "prayer.jamaatAria", { name: t(it.labelKey), time: it.time, status: t(STATUS_LABEL_KEYS[it.status] || STATUS_LABEL_KEYS.upcoming) })}
          >
            <small className="text-muted d-block">{t(it.labelKey)}</small>
            <div className="d-flex align-items-center justify-content-center gap-2">
              {it.status === "completed" ? (
                <CheckCircle size={16} className="text-success" aria-hidden="true" />
              ) : it.status === "next" ? (
                <Star size={16} className="text-mc" aria-hidden="true" />
              ) : (
                <Clock3 size={16} className="text-muted" aria-hidden="true" />
              )}
              <span className="h5 mb-0">{it.time}</span>
            </div>
            {it.adhan && (
              <div className="small text-muted mt-1">{t("prayer.adhan", { time: it.adhan })}</div>
            )}
            {it.estimated && <EstimatedBadge className="mt-1" />}
            {it.status === "next" && it.date && (
              <div className="small text-muted mt-1">{t("prayer.inTime", { time: formatRemaining(it.date.getTime() - now.getTime(), t) })}</div>
            )}
          </div>
        ))}
      </div>

      {hasEstimated && (
        <p className="small text-muted mt-2 mb-0">
          Times marked <EstimatedBadge /> are calculated from the mosque's location. Jamaat times are
          approximate until the mosque publishes its own.
        </p>
      )}
    </div>
  );
}
