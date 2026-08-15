import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock3, Star } from "lucide-react";

const DAILY_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function parsePrayerTime(name, timeStr, ref = new Date()) {
  const parts = String(timeStr || "").split(":");
  if (parts.length < 2) return null;
  let hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10) || 0;

  // Heuristic: Fajr = AM, others = PM (works for demo dataset)
  const isPM = name !== "Fajr";
  if (isNaN(hour)) return null;

  if (isPM) {
    if (hour < 12) hour += 12;
  } else {
    if (hour === 12) hour = 0;
  }

  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), hour, minute, 0, 0);
}

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

export default function PrayerTimeline({ prayers = {} }) {
  const [nowTick, setNowTick] = useState(Date.now());

  // update once per minute
  useEffect(() => {
    const tick = () => setNowTick(Date.now());
    // align to next whole minute for a cleaner UX
    const untilNextMinute = 60000 - (Date.now() % 60000);
    const t = setTimeout(() => {
      tick();
      const iv = setInterval(tick, 60000);
      // store on window for cleanup reference
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

  const list = useMemo(() => {
    const items = DAILY_PRAYERS.map((p) => {
      const dt = parsePrayerTime(p, prayers[p], now);
      return { name: p, time: prayers[p] || "—", date: dt };
    });

    // find next prayer (today), otherwise Fajr tomorrow
    const nextIndex = items.findIndex((it) => it.date && it.date.getTime() > now.getTime());
    if (nextIndex !== -1) {
      return items.map((it, i) => ({ ...it, status: i < nextIndex ? "completed" : i === nextIndex ? "next" : "upcoming" }));
    }

    // none remaining today -> next is Fajr tomorrow
    const tomorrowFajr = parsePrayerTime("Fajr", prayers.Fajr, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    return items.map((it, i) => ({ ...it, status: it.name === "Fajr" ? "next" : "completed", date: it.name === "Fajr" ? tomorrowFajr : it.date }));
  }, [prayers, nowTick]);

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
            aria-label={`${it.name} at ${it.time}. ${it.status}.`}
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
            {it.status === "next" && (
              <div className="small text-muted mt-1">in {formatRemaining(it.date.getTime() - now.getTime())}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
