import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock3, Star } from "lucide-react";
import { formatClockTime, parseClockTime } from "../utils/prayerTime";

const DAILY_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function formatRemaining(ms) {
  if (ms <= 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

function formatTime(date) {
  if (!date) return "—";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function PrayerTimeline({ prayers = {}, schedule = [] }) {
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const tick = () => setNowTick(Date.now());
    const untilNextMinute = 60000 - (Date.now() % 60000);
    const t = setTimeout(() => {
      tick();
      const iv = setInterval(tick, 60000);
      (window.__mcPrayerInterval = window.__mcPrayerInterval || []).push(iv);
    }, untilNextMinute);

    return () => {
      clearTimeout(t);
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
    const items = DAILY_PRAYERS.map((name) => {
      const jamaat = prayers[name];
      const details = scheduleByLabel[name];
      const dt = parseClockTime(jamaat, now);
      return {
        name,
        time: jamaat ? formatClockTime(jamaat) : "—",
        adhan: details?.adhan_time ? formatClockTime(details.adhan_time) : null,
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
  }, [prayers, scheduleByLabel, nowTick]);

  const next = list.find((l) => l.status === "next") || list[0];
  const remaining = next && next.date ? next.date.getTime() - now.getTime() : 0;

  return (
    <div className="mc-prayer-timeline">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="fw-bold">Today's prayers</div>
        <div className="mc-next-prayer text-end" aria-live="polite">
          <span>Next</span>
          <strong>{next ? `${next.name} ${formatTime(next.date)}` : "—"}</strong>
          <div><small className="text-muted">in {formatRemaining(remaining)}</small></div>
        </div>
      </div>

      <div className="mc-timeline-row d-flex">
        {list.map((it) => (
          <div
            key={it.name}
            className={"mc-prayer-item bg-light rounded-3 me-2 " + (it.status ? `mc-${it.status}` : "")}
            role="group"
            aria-label={`${it.name} jamaat at ${it.time}. ${it.status}.`}
          >
            <small className="text-muted d-block">{it.name}</small>
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
              <div className="small text-muted mt-1">Adhan {it.adhan}</div>
            )}
            {it.status === "next" && it.date && (
              <div className="small text-muted mt-1">in {formatRemaining(it.date.getTime() - now.getTime())}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
