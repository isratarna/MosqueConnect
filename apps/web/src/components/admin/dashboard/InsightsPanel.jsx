import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import DashboardCard from "./DashboardCard";
import InsightsLineChart from "./InsightsLineChart";
import { fetchInsights } from "../../../utils/dashboardApi";
import { formatShortDate, percent } from "../../../utils/dashboardFormat";
import { useLocale } from "../../../hooks/useLocale";
import { formatNumber } from "../../../utils/intl";

const RANGES = ["7d", "30d", "90d"];
// [Urmee · i18n dashboard] Series labels are translation keys, resolved inside the component.
const SERIES = [
  { key: "profile_views", labelKey: "dashboard.insights.profileViews", color: "var(--mc-series-1)" },
  { key: "direction_clicks", labelKey: "dashboard.insights.directionTaps", color: "var(--mc-series-2)" },
  { key: "follows", labelKey: "dashboard.insights.newFollows", color: "var(--mc-series-3)" },
];

/** Who used the mosque's page: views, direction and call taps, follows, announcement reach. */
export default function InsightsPanel({ mosqueId }) {
  const { t, locale } = useLocale();
  const num = (value) => formatNumber(value, locale);
  const series = SERIES.map((item) => ({ ...item, label: t(item.labelKey) }));
  const rangeLabel = (value) => t(`dashboard.insights.range${value}`);
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
    [t("dashboard.insights.profileViews"), num(totals.profile_views), null],
    [t("dashboard.insights.directionTaps"), num(totals.direction_clicks), t("dashboard.insights.callTapsSub", { count: totals.call_clicks })],
    [t("dashboard.insights.newFollows"), num(totals.follows), t("dashboard.insights.followsSub", { unfollows: totals.unfollows, total: totals.followers_count })],
    [t("dashboard.insights.readRate"), percent(totals.announcement_read_rate), totals.notifications_delivered ? t("dashboard.insights.readSub", { read: totals.notifications_read, delivered: totals.notifications_delivered }) : t("dashboard.insights.noneSent")],
  ] : [];

  return (
    <div className="d-grid gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h2 className="h4 mb-1">{t("dashboard.insights.heading")}</h2>
          <p className="text-muted small mb-0">{t("dashboard.insights.intro")}</p>
        </div>
        <div className="btn-group btn-group-sm" role="group" aria-label={t("dashboard.insights.range")}>
          {RANGES.map((value) => (
            <button key={value} type="button" className={`btn ${range === value ? "btn-mc" : "btn-outline-secondary"}`} aria-pressed={range === value} onClick={() => setRange(value)}>{rangeLabel(value)}</button>
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

      <DashboardCard title={t("dashboard.insights.dailyActivity", { range: rangeLabel(range) })} icon={BarChart3} loading={!data && !error} error={error} onRetry={() => setRetry((n) => n + 1)} skeletonLines={6}>
        {data && (
          <>
            <InsightsLineChart series={series} data={data.series} />
            <details className="mt-2 small">
              <summary>{t("dashboard.insights.showTable")}</summary>
              <div className="table-responsive mt-2" style={{ maxHeight: 280 }}>
                <table className="table table-sm mb-0">
                  <thead><tr><th scope="col">{t("dashboard.insights.date")}</th>{series.map((item) => <th scope="col" key={item.key}>{item.label}</th>)}<th scope="col">{t("dashboard.insights.callTaps")}</th><th scope="col">{t("dashboard.insights.unfollows")}</th></tr></thead>
                  <tbody>
                    {[...data.series].reverse().map((day) => (
                      <tr key={day.date}><th scope="row">{formatShortDate(day.date, locale)}</th>{series.map((item) => <td key={item.key}>{num(day[item.key])}</td>)}<td>{num(day.call_clicks)}</td><td>{num(day.unfollows)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </DashboardCard>

      <DashboardCard title={t("dashboard.insights.reachTitle")} icon={BarChart3} loading={!data && !error} error={error} onRetry={() => setRetry((n) => n + 1)}>
        {data?.announcements?.length ? (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <caption className="small">{t("dashboard.insights.reachCaption")}</caption>
              <thead><tr><th scope="col">{t("dashboard.insights.announcement")}</th><th scope="col" className="text-end">{t("dashboard.insights.notified")}</th><th scope="col" className="text-end">{t("dashboard.insights.read")}</th><th scope="col" className="text-end">{t("dashboard.insights.readRateShort")}</th></tr></thead>
              <tbody>
                {data.announcements.map((item) => (
                  <tr key={item.id}>
                    <th scope="row" className="fw-normal"><span className="fw-semibold">{item.title}</span><div className="small text-muted">{formatShortDate(item.published_at, locale)}</div></th>
                    <td className="text-end">{num(item.delivered)}</td>
                    <td className="text-end">{num(item.read)}</td>
                    <td className="text-end">{percent(item.read_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted small mb-0">{t("dashboard.insights.noReach")}</p>
        )}
      </DashboardCard>
    </div>
  );
}
