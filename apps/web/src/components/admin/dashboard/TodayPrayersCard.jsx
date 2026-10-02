import { Clock3 } from "lucide-react";
import DashboardCard from "./DashboardCard";
import EstimatedBadge from "../../EstimatedBadge";
import { formatClockTime } from "../../../utils/prayerTime";

/** Today's jamaat times with the next one highlighted. */
export default function TodayPrayersCard({ data, loading, error, onRetry, onEdit }) {
  const next = data?.next_jamaat;
  const isNext = (prayer, label) => next && !next.tomorrow && next.prayer === prayer && (prayer !== "jumuah" || next.label === label);
  const rows = (data?.schedule || []).flatMap((entry) => {
    if (entry.prayer === "dhuhr" && data.is_friday && data.jumuah_sessions?.length) {
      return data.jumuah_sessions.map((session) => ({ key: `jumuah-${session.sequence}`, prayer: "jumuah", label: session.label, adhan: session.khutbah_time, jamaat: session.jamaat_time, adhanLabel: "Khutbah" }));
    }
    return [{ key: entry.prayer, prayer: entry.prayer, label: entry.label, adhan: entry.adhan_time, jamaat: entry.jamaat_time, adhanLabel: "Adhan", estimated: entry.source === "calculated" }];
  });

  return (
    <DashboardCard
      title="Today's prayer times"
      icon={Clock3}
      loading={loading}
      error={error}
      onRetry={onRetry}
      skeletonLines={5}
      action={<button type="button" className="btn btn-link btn-sm text-mc p-0" onClick={onEdit}>Edit</button>}
    >
      {next && (
        <p className="mc-dash-next mb-3">
          Next jamaat: <strong>{next.label} at {formatClockTime(next.jamaat_time)}</strong>{next.tomorrow ? " tomorrow" : ""}
        </p>
      )}
      {rows.length ? (
        <table className="table table-sm align-middle mb-0 mc-dash-prayers">
          <caption className="visually-hidden">Prayer times for {data.date}</caption>
          <thead>
            <tr><th scope="col">Prayer</th><th scope="col">Adhan</th><th scope="col">Jamaat</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={isNext(row.prayer, row.label) ? "is-next" : undefined} aria-current={isNext(row.prayer, row.label) ? "time" : undefined}>
                <th scope="row">{row.label}{row.estimated && <> <EstimatedBadge /></>}</th>
                <td>{row.adhan ? formatClockTime(row.adhan) : "—"}{row.adhanLabel === "Khutbah" && row.adhan && <span className="visually-hidden"> khutbah</span>}</td>
                <td className="fw-semibold">{formatClockTime(row.jamaat)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted small mb-0">No prayer times yet. Add them, or set the mosque's map location so they can be estimated.</p>
      )}
    </DashboardCard>
  );
}
