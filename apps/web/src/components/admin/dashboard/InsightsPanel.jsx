import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import DashboardCard from "./DashboardCard";
import InsightsLineChart from "./InsightsLineChart";
import { fetchInsights } from "../../../utils/dashboardApi";
import { formatShortDate, percent } from "../../../utils/dashboardFormat";

const RANGES = [["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"]];
const SERIES = [
  { key: "profile_views", label: "Profile views", color: "var(--mc-series-1)" },
  { key: "direction_clicks", label: "Direction taps", color: "var(--mc-series-2)" },
  { key: "follows", label: "New follows", color: "var(--mc-series-3)" },
];

/** Who used the mosque's page: views, direction and call taps, follows, announcement reach. */
export default function InsightsPanel({ mosqueId }) {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setData(null);
    fetchInsights(mosqueId, range, { signal: controller.signal })
      .then(setData)
      .catch((err) => { if (err.name !== "AbortError") setError(err.message); });
    return () => controller.abort();
  }, [mosqueId, range, retry]);

  const totals = data?.totals;
  const tiles = totals ? [
    ["Profile views", totals.profile_views, null],
    ["Direction taps", totals.direction_clicks, `${totals.call_clicks} call taps`],
    ["New follows", totals.follows, `${totals.unfollows} unfollows · ${totals.followers_count} total`],
    ["Announcement read rate", percent(totals.announcement_read_rate), totals.notifications_delivered ? `${totals.notifications_read} of ${totals.notifications_delivered} notifications read` : "No announcements sent"],
  ] : [];

  return (
    <div className="d-grid gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h2 className="h4 mb-1">Insights</h2>
          <p className="text-muted small mb-0">Counts are anonymous: no visitor details are stored. Bots are not counted.</p>
        </div>
        <div className="btn-group btn-group-sm" role="group" aria-label="Date range">
          {RANGES.map(([value, label]) => (
            <button key={value} type="button" className={`btn ${range === value ? "btn-mc" : "btn-outline-secondary"}`} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="mc-dash-tiles">
        {(tiles.length ? tiles : Array.from({ length: 4 }, () => null)).map((tile, index) => (
          <div className="card mc-dash-card" key={tile?.[0] || index}>
            <div className="card-body">
              {tile ? (
                <>
                  <div className="small text-muted">{tile[0]}</div>
                  <div className="mc-dash-hero">{tile[1]}</div>
                  {tile[2] && <div className="small text-muted">{tile[2]}</div>}
                </>
              ) : error ? <span className="small text-muted">—</span> : <span className="placeholder-glow d-block" aria-hidden="true"><span className="placeholder col-8 rounded d-block mb-2" /><span className="placeholder col-5 rounded d-block" style={{ height: "1.6rem" }} /></span>}
            </div>
          </div>
        ))}
      </div>

      <DashboardCard title={`Daily activity, last ${RANGES.find(([value]) => value === range)[1]}`} icon={BarChart3} loading={!data && !error} error={error} onRetry={() => setRetry((n) => n + 1)} skeletonLines={6}>
        {data && (
          <>
            <InsightsLineChart series={SERIES} data={data.series} />
            <details className="mt-2 small">
              <summary>Show as a table</summary>
              <div className="table-responsive mt-2" style={{ maxHeight: 280 }}>
                <table className="table table-sm mb-0">
                  <thead><tr><th scope="col">Date</th>{SERIES.map((item) => <th scope="col" key={item.key}>{item.label}</th>)}<th scope="col">Call taps</th><th scope="col">Unfollows</th></tr></thead>
                  <tbody>
                    {[...data.series].reverse().map((day) => (
                      <tr key={day.date}><th scope="row">{formatShortDate(day.date)}</th>{SERIES.map((item) => <td key={item.key}>{day[item.key]}</td>)}<td>{day.call_clicks}</td><td>{day.unfollows}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </DashboardCard>

      <DashboardCard title="Announcement reach" icon={BarChart3} loading={!data && !error} error={error} onRetry={() => setRetry((n) => n + 1)}>
        {data?.announcements?.length ? (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <caption className="small">Followers are notified when an announcement is published. “Read” means they opened the notification.</caption>
              <thead><tr><th scope="col">Announcement</th><th scope="col" className="text-end">Notified</th><th scope="col" className="text-end">Read</th><th scope="col" className="text-end">Read rate</th></tr></thead>
              <tbody>
                {data.announcements.map((item) => (
                  <tr key={item.id}>
                    <th scope="row" className="fw-normal"><span className="fw-semibold">{item.title}</span><div className="small text-muted">{formatShortDate(item.published_at)}</div></th>
                    <td className="text-end">{item.delivered}</td>
                    <td className="text-end">{item.read}</td>
                    <td className="text-end">{percent(item.read_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted small mb-0">No announcements were published in this period.</p>
        )}
      </DashboardCard>
    </div>
  );
}
