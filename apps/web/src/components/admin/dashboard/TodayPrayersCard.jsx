import { Clock3 } from "lucide-react";
import DashboardCard from "./DashboardCard";
import EstimatedBadge from "../../EstimatedBadge";
import { formatClockTime } from "../../../utils/prayerTime";
import { formatApiDate } from "../../../utils/intl";
import { useLocale } from "../../../hooks/useLocale";

/** Today's jamaat times with the next one highlighted. */
export default function TodayPrayersCard({ data, loading, error, onRetry, onEdit }) {
  const { t, locale } = useLocale();
  const next = data?.next_jamaat;
  const isNext = (prayer, label) => next && !next.tomorrow && next.prayer === prayer && (prayer !== "jumuah" || next.label === label);
  const rows = (data?.schedule || []).flatMap((entry) => {
    if (entry.prayer === "dhuhr" && data.is_friday && data.jumuah_sessions?.length) {
      return data.jumuah_sessions.map((session) => ({ key: `jumuah-${session.sequence}`, prayer: "jumuah", label: session.label, adhan: session.khutbah_time, jamaat: session.jamaat_time, adhanLabel: "Khutbah" }));
    }
    return [{ key: entry.prayer, prayer: entry.prayer, label: t(`prayer.${entry.prayer}`, { defaultValue: entry.label }), adhan: entry.adhan_time, jamaat: entry.jamaat_time, adhanLabel: "Adhan", estimated: entry.source === "calculated" }];
  });

  return (
    <DashboardCard
      title={t("dashboard.today.title")}
      icon={Clock3}
      loading={loading}
      error={error}
      onRetry={onRetry}
      skeletonLines={5}
      action={onEdit && <button type="button" className="btn btn-link btn-sm text-mc p-0" onClick={onEdit}>{t("dashboard.today.edit")}</button>}
    >
      {next && (
        <p className="mc-dash-next mb-3">
          {t("dashboard.today.nextJamaat")} <strong>{t("dashboard.today.nextAt", { label: t(`prayer.${next.prayer}`, { defaultValue: next.label }), time: formatClockTime(next.jamaat_time, locale) })}</strong>{next.tomorrow ? ` ${t("prayer.tomorrow")}` : ""}
        </p>
      )}
      {rows.length ? (
        <table className="table table-sm align-middle mb-0 mc-dash-prayers">
          <caption className="visually-hidden">{t("dashboard.today.caption", { date: formatApiDate(data.date, locale) })}</caption>
          <thead>
            <tr><th scope="col">{t("schedule.prayer")}</th><th scope="col">{t("schedule.adhan")}</th><th scope="col">{t("schedule.jamaat")}</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={isNext(row.prayer, row.label) ? "is-next" : undefined} aria-current={isNext(row.prayer, row.label) ? "time" : undefined}>
                <th scope="row">{row.label}{row.estimated && <> <EstimatedBadge /></>}</th>
                <td>{row.adhan ? formatClockTime(row.adhan, locale) : "—"}{row.adhanLabel === "Khutbah" && row.adhan && <span className="visually-hidden"> {t("dashboard.today.khutbah")}</span>}</td>
                <td className="fw-semibold">{formatClockTime(row.jamaat, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted small mb-0">{t("dashboard.today.empty")}</p>
      )}
    </DashboardCard>
  );
}
