<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\MosqueDashboardResource;
use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\Mosque;
use App\Services\DashboardQueryService;
use Illuminate\Support\Facades\Gate;
use Throwable;

class MosqueDashboardController extends Controller
{
    public function __construct(private readonly DashboardQueryService $queries) {}

    public function show(Mosque $mosque): MosqueDashboardResource
    {
        Gate::authorize('view', $mosque);

        $mosque->followers_count = $mosque->followers()->count();
        $mosque->active_announcements_count = $mosque->announcements()->published()->count();
        $mosque->upcoming_events_count = $mosque->events()
            ->where('status', Event::STATUS_PUBLISHED)
            ->where('moderation_status', Event::MODERATION_APPROVED)
            ->whereDate('event_date', '>=', today())
            ->count();
        $mosque->active_campaigns_count = $mosque->campaigns()->publiclyActive()->count();
        $mosque->pending_content_reports_count = $this->pendingReportsCount($mosque);

        $mosque->recent_content = $this->recentContent($mosque);
        $mosque->pending_content_reports = $this->pendingReports($mosque);

        // Each card's data is loaded on its own, so one failing query leaves the
        // rest of the dashboard working. Failed sections are null and listed.
        $failed = [];
        $section = function (string $key, callable $load) use (&$failed) {
            try {
                return $load();
            } catch (Throwable $exception) {
                report($exception);
                $failed[] = $key;

                return null;
            }
        };

        $mosque->pending_pledges_count = $section('pending_pledges', fn (): int => $this->queries->pendingPledgesCount($mosque));
        $mosque->today_prayers = $section('today_prayers', fn (): array => $this->queries->todayPrayers($mosque));
        $mosque->upcoming_events = $section('upcoming_events', fn (): array => $this->queries->upcomingEvents($mosque));
        $mosque->active_campaigns = $section('active_campaigns', fn (): array => $this->queries->activeCampaigns($mosque));
        $mosque->pending_pledges = $section('pending_pledges', fn (): array => $this->queries->pendingPledges($mosque));
        $mosque->follower_growth = $section('follower_growth', fn (): array => $this->queries->followerGrowth($mosque));
        $mosque->profile_completeness = $section('profile_completeness', fn (): array => $this->queries->profileCompleteness($mosque));
        $mosque->failed_sections = array_values(array_unique($failed));

        return new MosqueDashboardResource($mosque);
    }

    /**
     * Count content reports against this mosque's content that still need action.
     */
    private function pendingReportsCount(Mosque $mosque): int
    {
        return $this->pendingReportsQuery($mosque)->count();
    }

    /**
     * Recent content reports against this mosque's content that still need action.
     *
     * @return list<array<string, mixed>>
     */
    private function pendingReports(Mosque $mosque): array
    {
        return $this->pendingReportsQuery($mosque)
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn (ContentReport $report): array => [
                'id' => $report->id,
                'type' => $report->reportable_type,
                'category' => $report->category,
                'reason' => $report->reason,
                'status' => $report->status,
                'created_at' => $report->created_at?->toJSON(),
            ])
            ->values()
            ->all();
    }

    /**
     * Build a scoped query for pending/reviewing content reports against this mosque's content.
     *
     * @return \Illuminate\Database\Eloquent\Builder<ContentReport>
     */
    private function pendingReportsQuery(Mosque $mosque)
    {
        $announcementIds = $mosque->announcements()->select('id');
        $eventIds = $mosque->events()->select('id');
        $campaignIds = $mosque->campaigns()->select('id');

        return ContentReport::query()
            ->whereIn('status', [ContentReport::STATUS_PENDING, ContentReport::STATUS_REVIEWING])
            ->where(function ($query) use ($mosque, $announcementIds, $eventIds, $campaignIds): void {
                $query
                    ->where(fn ($q) => $q->where('reportable_type', 'mosque')->where('reportable_id', $mosque->id))
                    ->orWhere(fn ($q) => $q->where('reportable_type', 'announcement')->whereIn('reportable_id', $announcementIds))
                    ->orWhere(fn ($q) => $q->where('reportable_type', 'event')->whereIn('reportable_id', $eventIds))
                    ->orWhere(fn ($q) => $q->where('reportable_type', 'campaign')->whereIn('reportable_id', $campaignIds));
            });
    }

    /**
     * A combined feed of the mosque's most recent content items.
     *
     * @return list<array<string, mixed>>
     */
    private function recentContent(Mosque $mosque): array
    {
        $announcements = $mosque->announcements()
            ->latest('id')
            ->limit(3)
            ->get()
            ->map(fn (Announcement $item): array => $this->contentItem('announcement', $item->id, $item->title, $item->status, $item->created_at));

        $events = $mosque->events()
            ->latest('id')
            ->limit(3)
            ->get()
            ->map(fn (Event $item): array => $this->contentItem('event', $item->id, $item->title, $item->status, $item->created_at));

        $campaigns = $mosque->campaigns()
            ->latest('id')
            ->limit(3)
            ->get()
            ->map(fn (Campaign $item): array => $this->contentItem('campaign', $item->id, $item->title, $item->status, $item->created_at));

        return collect()
            ->merge($announcements)
            ->merge($events)
            ->merge($campaigns)
            ->sortByDesc('created_at')
            ->values()
            ->take(8)
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function contentItem(string $type, int $id, string $title, string $status, $createdAt): array
    {
        return [
            'type' => $type,
            'id' => $id,
            'title' => $title,
            'status' => $status,
            'created_at' => $createdAt?->toJSON(),
        ];
    }
}
