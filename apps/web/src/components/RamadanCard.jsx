import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Moon } from "lucide-react";
import { useLocale } from "../hooks/useLocale";
import { useNow } from "../hooks/useNow";
import { formatApiDate } from "../utils/intl";
import { formatClockTime } from "../utils/prayerTime";
import { ramadanPhase, timeLeft } from "../utils/ramadan";
import { fetchRamadan } from "../utils/scheduleApi";
import { Skeleton } from "./skeletons";

/**
 * [Urmee · F4] Ramadan card for the top of a mosque profile: a live countdown to Iftar (after Iftar,
 * to the end of tomorrow's Sehri), today's Sehri / Iftar / Taraweeh, and an expandable table of the whole
 * month with today highlighted. The profile only mounts it while the mosque's current period is a Ramadan
 * one; if the API still says "no Ramadan today" (404) the card renders nothing.
 */
export default function RamadanCard({ mosqueId }) {
  const { t, locale } = useLocale();
  // [Urmee · VIVA] useNow(1000) = protit second e "ekhon" bodlay, tai countdown live cholte thake.
  const now = useNow(1000); // one tick a second keeps the countdown live
  const [state, setState] = useState({ status: "loading", data: null });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null });
    fetchRamadan(mosqueId, { signal: controller.signal })
      .then((data) => setState({ status: "done", data }))
      .catch((error) => { if (error.name !== "AbortError") setState({ status: "done", data: null }); });
    return () => controller.abort();
  }, [mosqueId]);

  // [Urmee · VIVA] Load howar shomoy skeleton, data na thakle (Ramadan na) kichu render kori na.
  if (state.status === "loading") return <div className="card mc-card mb-4 p-4"><Skeleton height="1.4rem" width="50%" /></div>;
  if (!state.data) return null;

  const { period, timings } = state.data;
  // [Urmee · VIVA] ramadanPhase diye bujhi kon countdown (Iftar na Sehri) ar target koto shomoy porjonto. timeLeft diye baki shomoy ber kori.
  const { phase, targetAt, today } = ramadanPhase(timings, now);
  const left = targetAt ? timeLeft(targetAt, now) : null;
  const todayKey = today?.date;
  const time = (value) => (value ? formatClockTime(value, locale) : "—");

  return (
    <section className="card mc-card mc-ramadan-card mb-4" id="ramadan" aria-labelledby="ramadan-title">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-2">
          <h2 id="ramadan-title" className="h5 fw-bold mb-0"><Moon size={18} className="text-mc me-2" aria-hidden="true" />{t("ramadan.title")}</h2>
          <span className="small text-muted">{t("ramadan.period", { name: period.name, date: formatApiDate(period.ends_on, locale) })}</span>
        </div>

        {left ? (
          <div className="mc-ramadan-card__countdown" role="timer" aria-live="off">
            <span className="small text-muted d-block">{t(phase === "iftar" ? "ramadan.iftarIn" : "ramadan.sehriEndsIn")}</span>
            <strong className="mc-ramadan-card__time">{t("ramadan.countdown", left)}</strong>
          </div>
        ) : <p className="text-muted mb-2">{t("ramadan.done")}</p>}

        {today && (
          <dl className="row text-center g-2 mb-3 mt-1">
            {[["sehri", today.sehri_ends], ["iftar", today.iftar], ["taraweeh", today.taraweeh_time]].map(([key, value]) => (
              <div className="col-4" key={key}>
                <dt className="small text-muted fw-normal">{t(`ramadan.${key}`)}</dt>
                <dd className="h5 mb-0">{time(value)}</dd>
              </div>
            ))}
          </dl>
        )}

        <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" aria-expanded={expanded} aria-controls="ramadan-month" onClick={() => setExpanded((open) => !open)}>
          {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />} {expanded ? t("ramadan.hideMonth") : t("ramadan.showMonth")}
        </button>

        {expanded && (
          <div id="ramadan-month" className="table-responsive mt-2">
            <table className="table table-sm align-middle mb-0">
              <thead><tr><th scope="col">{t("ramadan.day")}</th><th scope="col">{t("ramadan.sehri")}</th><th scope="col">{t("ramadan.iftar")}</th><th scope="col">{t("ramadan.taraweeh")}</th></tr></thead>
              <tbody>
                {timings.map((row) => (
                  <tr key={row.date} className={row.date === todayKey ? "table-active fw-semibold" : undefined} aria-current={row.date === todayKey ? "date" : undefined}>
                    <th scope="row" className="fw-normal text-nowrap">{formatApiDate(row.date, locale, { weekday: "short", day: "numeric", month: "short" })}{row.date === todayKey && <span className="badge text-bg-warning ms-2">{t("ramadan.today")}</span>}</th>
                    <td>{time(row.sehri_ends)}</td>
                    <td>{time(row.iftar)}</td>
                    <td>{time(row.taraweeh_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
