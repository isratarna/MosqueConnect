import { useCallback, useEffect, useState } from "react";
import QuickPostCard from "./QuickPostCard";
import AnnouncementsCard from "./AnnouncementsCard";
import TodayPrayersCard from "./TodayPrayersCard";
import AttentionCard from "./AttentionCard";
import { ActiveCampaignsCard, FollowersCard, UpcomingEventsCard } from "./ActivityCards";
import { useLocale } from "../../../hooks/useLocale";
import { fetchDashboard } from "../../../utils/dashboardApi";
import { can } from "../../../utils/teamRoles";

/**
 * The admin's home: daily jobs on one screen. Every card renders on its own;
 * if the dashboard request or one of its sections fails, only those cards
 * show an error with Retry, and Quick post / Announcements keep working.
 */
export default function DashboardOverview({ mosqueId, mosqueName, abilities = [], onNavigate }) {
  const { t } = useLocale();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [postRevision, setPostRevision] = useState(0);

  const reload = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetchDashboard(mosqueId, { signal: controller.signal })
      .then(setData)
      .catch((err) => { if (err.name !== "AbortError") setError(err.message || t("dashboard.overview.loadFailed")); });
    return () => controller.abort();
  }, [mosqueId, revision]);

  // Keep showing the last good data while a reload is in flight.
  const loading = !data && !error;
  const failed = data?.failed_sections || [];
  const cardError = (key) => (!data && error) || (failed.includes(key) ? t("dashboard.overview.cardFailed") : "");

  // Cards follow the user's team role: editors don't get prayer editing,
  // prayer-times members don't get the content cards.
  const content = can(abilities, "content");
  const prayerTimes = can(abilities, "prayer_times");

  return (
    <div className="mc-dash-grid">
      {content && <QuickPostCard mosqueId={mosqueId} mosqueName={mosqueName} onPosted={() => { setPostRevision((n) => n + 1); reload(); }} />}
      {content && <AnnouncementsCard mosqueId={mosqueId} revision={postRevision} onViewAll={() => onNavigate("announcements")} />}
      <TodayPrayersCard data={data?.today_prayers} loading={loading} error={cardError("today_prayers")} onRetry={reload} onEdit={prayerTimes ? () => onNavigate("prayer") : undefined} />
      <AttentionCard data={data} abilities={abilities} loading={loading} error={!data ? error : ""} failed={failed} onRetry={reload} onReviewed={reload} onNavigate={onNavigate} />
      {content && <UpcomingEventsCard events={data?.upcoming_events} loading={loading} error={cardError("upcoming_events")} onRetry={reload} onManage={() => onNavigate("events")} />}
      {content && <ActiveCampaignsCard campaigns={data?.active_campaigns} loading={loading} error={cardError("active_campaigns")} onRetry={reload} onManage={() => onNavigate("donations")} />}
      <FollowersCard total={data?.summary?.followers_count} growth={data?.follower_growth} loading={loading} error={cardError("follower_growth")} onRetry={reload} />
    </div>
  );
}
