import { useState } from "react";
import { CalendarDays, HandCoins, Users } from "lucide-react";
import DashboardCard from "./DashboardCard";
import CampaignProgress from "../../campaigns/CampaignProgress";
import { formatClockTime } from "../../../utils/prayerTime";
import { formatShortDate, plotPoints, pointsToPath } from "../../../utils/dashboardFormat";
import { useLocale } from "../../../hooks/useLocale";
import { formatNumber } from "../../../utils/intl";

export function UpcomingEventsCard({ events, loading, error, onRetry, onManage }) {
  const { t, locale } = useLocale();
  return (
    <DashboardCard
      title={t("dashboard.activity.eventsTitle")}
      icon={CalendarDays}
      loading={loading}
      error={error}
      onRetry={onRetry}
      action={<button type="button" className="btn btn-link btn-sm text-mc p-0" onClick={onManage}>{t("dashboard.activity.manage")}</button>}
    >
      {events?.length ? (
        <ul className="list-unstyled mc-dash-list mb-0">
          {events.map((event) => (
            <li key={event.id}>
              <div className="min-w-0">
                <div className="fw-semibold text-truncate">{event.title}</div>
                <div className="small text-muted">{formatShortDate(event.event_date, locale)}{event.start_time ? ` · ${formatClockTime(event.start_time, locale)}` : ""}{event.location ? ` · ${event.location}` : ""}</div>
              </div>
              <span className="small text-nowrap text-muted" title={t("dashboard.activity.registrations")}>
                {event.capacity ? t("dashboard.activity.goingOf", { count: event.registrations_count, capacity: event.capacity }) : t("dashboard.activity.going", { count: event.registrations_count })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted small mb-0">{t("dashboard.activity.noEvents")}</p>
      )}
    </DashboardCard>
  );
}

export function ActiveCampaignsCard({ campaigns, loading, error, onRetry, onManage }) {
  const { t } = useLocale();
  return (
    <DashboardCard
      title={t("dashboard.activity.campaignsTitle")}
      icon={HandCoins}
      loading={loading}
      error={error}
      onRetry={onRetry}
      action={<button type="button" className="btn btn-link btn-sm text-mc p-0" onClick={onManage}>{t("dashboard.activity.manage")}</button>}
    >
      {campaigns?.length ? (
        <ul className="list-unstyled mb-0 d-grid gap-3">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <div className="d-flex justify-content-between gap-2 small mb-1">
                <strong className="text-truncate">{campaign.title}</strong>
                <span className="text-muted text-nowrap">{campaign.days_left === 0 ? t("dashboard.activity.endsToday") : t("dashboard.activity.daysLeft", { count: campaign.days_left })}</span>
              </div>
              <CampaignProgress campaign={campaign} compact />
              {campaign.moderation_status !== "approved" && <span className="badge bg-secondary">{t("dashboard.activity.awaitingModeration")}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted small mb-0">{t("dashboard.activity.noCampaigns")}</p>
      )}
    </DashboardCard>
  );
}

const SPARK = { width: 220, height: 56, padding: 6 };

/** Follower total and new followers per week as an inline SVG sparkline. */
export function FollowersCard({ total, growth, loading, error, onRetry }) {
  const { t, locale } = useLocale();
  const [hover, setHover] = useState(null);
  const counts = (growth || []).map((week) => week.count);
  const points = plotPoints(counts, { ...SPARK, max: Math.max(...counts, 1) });
  const recent = counts.slice(-4).reduce((sum, value) => sum + value, 0);
  const active = hover ?? counts.length - 1;

  return (
    <DashboardCard title={t("dashboard.activity.followers")} icon={Users} loading={loading} error={error} onRetry={onRetry} skeletonLines={3}>
      <div className="d-flex align-items-end justify-content-between gap-3 flex-wrap">
        <div>
          <div className="mc-dash-hero">{formatNumber(total ?? 0, locale)}</div>
          <div className="small text-muted">{t("dashboard.activity.followersRecent", { count: recent })}</div>
        </div>
        {growth?.length > 0 && (
          <figure className="mb-0 mc-dash-spark">
            <svg
              viewBox={`0 0 ${SPARK.width} ${SPARK.height}`}
              width="100%"
              height={SPARK.height}
              role="img"
              aria-label={t("dashboard.activity.sparkAria", { weeks: growth.length, counts: counts.map((count) => formatNumber(count, locale)).join(", ") })}
              onPointerLeave={() => setHover(null)}
            >
              <line x1="0" x2={SPARK.width} y1={SPARK.height - SPARK.padding} y2={SPARK.height - SPARK.padding} className="mc-chart-baseline" />
              <path d={pointsToPath(points)} className="mc-chart-line" style={{ stroke: "var(--mc-series-1)" }} />
              {points.map((point, index) => (
                <g key={growth[index].week_start}>
                  <rect
                    x={point.x - SPARK.width / counts.length / 2}
                    y="0"
                    width={SPARK.width / counts.length}
                    height={SPARK.height}
                    fill="transparent"
                    onPointerEnter={() => setHover(index)}
                  />
                  {index === active && <circle cx={point.x} cy={point.y} r="4" className="mc-chart-dot" style={{ fill: "var(--mc-series-1)" }} />}
                </g>
              ))}
            </svg>
            <figcaption className="small text-muted text-end">
              {t("dashboard.activity.weekOf", { date: formatShortDate(growth[active].week_start, locale) })} <strong className="text-body">+{formatNumber(counts[active], locale)}</strong>
            </figcaption>
          </figure>
        )}
      </div>
    </DashboardCard>
  );
}
