import { useState } from "react";
import { CalendarDays, HandCoins, Users } from "lucide-react";
import DashboardCard from "./DashboardCard";
import CampaignProgress from "../../campaigns/CampaignProgress";
import { formatClockTime } from "../../../utils/prayerTime";
import { formatShortDate, plotPoints, pointsToPath } from "../../../utils/dashboardFormat";

export function UpcomingEventsCard({ events, loading, error, onRetry, onManage }) {
  return (
    <DashboardCard
      title="Upcoming events"
      icon={CalendarDays}
      loading={loading}
      error={error}
      onRetry={onRetry}
      action={<button type="button" className="btn btn-link btn-sm text-mc p-0" onClick={onManage}>Manage</button>}
    >
      {events?.length ? (
        <ul className="list-unstyled mc-dash-list mb-0">
          {events.map((event) => (
            <li key={event.id}>
              <div className="min-w-0">
                <div className="fw-semibold text-truncate">{event.title}</div>
                <div className="small text-muted">{formatShortDate(event.event_date)}{event.start_time ? ` · ${formatClockTime(event.start_time)}` : ""}{event.location ? ` · ${event.location}` : ""}</div>
              </div>
              <span className="small text-nowrap text-muted" title="Registrations / capacity">
                {event.registrations_count}{event.capacity ? ` / ${event.capacity}` : ""} going
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted small mb-0">No upcoming published events.</p>
      )}
    </DashboardCard>
  );
}

export function ActiveCampaignsCard({ campaigns, loading, error, onRetry, onManage }) {
  return (
    <DashboardCard
      title="Active campaigns"
      icon={HandCoins}
      loading={loading}
      error={error}
      onRetry={onRetry}
      action={<button type="button" className="btn btn-link btn-sm text-mc p-0" onClick={onManage}>Manage</button>}
    >
      {campaigns?.length ? (
        <ul className="list-unstyled mb-0 d-grid gap-3">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <div className="d-flex justify-content-between gap-2 small mb-1">
                <strong className="text-truncate">{campaign.title}</strong>
                <span className="text-muted text-nowrap">{campaign.days_left === 0 ? "Ends today" : `${campaign.days_left} days left`}</span>
              </div>
              <CampaignProgress campaign={campaign} compact />
              {campaign.moderation_status !== "approved" && <span className="badge bg-secondary">Awaiting moderation</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted small mb-0">No active campaigns.</p>
      )}
    </DashboardCard>
  );
}

const SPARK = { width: 220, height: 56, padding: 6 };

/** Follower total and new followers per week as an inline SVG sparkline. */
export function FollowersCard({ total, growth, loading, error, onRetry }) {
  const [hover, setHover] = useState(null);
  const counts = (growth || []).map((week) => week.count);
  const points = plotPoints(counts, { ...SPARK, max: Math.max(...counts, 1) });
  const recent = counts.slice(-4).reduce((sum, value) => sum + value, 0);
  const active = hover ?? counts.length - 1;

  return (
    <DashboardCard title="Followers" icon={Users} loading={loading} error={error} onRetry={onRetry} skeletonLines={3}>
      <div className="d-flex align-items-end justify-content-between gap-3 flex-wrap">
        <div>
          <div className="mc-dash-hero">{total ?? 0}</div>
          <div className="small text-muted">+{recent} in the last 4 weeks</div>
        </div>
        {growth?.length > 0 && (
          <figure className="mb-0 mc-dash-spark">
            <svg
              viewBox={`0 0 ${SPARK.width} ${SPARK.height}`}
              width="100%"
              height={SPARK.height}
              role="img"
              aria-label={`New followers per week for the last ${growth.length} weeks: ${counts.join(", ")}`}
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
              Week of {formatShortDate(growth[active].week_start)}: <strong className="text-body">+{counts[active]}</strong>
            </figcaption>
          </figure>
        )}
      </div>
    </DashboardCard>
  );
}
