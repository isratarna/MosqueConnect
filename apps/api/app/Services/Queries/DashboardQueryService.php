<?php

namespace App\Services\Queries;

use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\Mosque;

class DashboardQueryService
{
    public function followersCount(Mosque $mosque): int
    {
        return $mosque->followers()->count();
    }

    public function activeAnnouncementsCount(Mosque $mosque): int
    {
        return $mosque->announcements()->published()->count();
    }

    public function upcomingEventsCount(Mosque $mosque): int
    {
        return $mosque->events()
            ->where('status', Event::STATUS_PUBLISHED)
            ->where('moderation_status', Event::MODERATION_APPROVED)
            ->whereDate('event_date', '>=', today())
            ->count();
    }

    public function activeCampaignsCount(Mosque $mosque): int
    {
        return $mosque->campaigns()->publiclyActive()->count();
    }

    public function pendingReportsCount(Mosque $mosque): int
    {
        return $this->pendingReportsQuery($mosque)->count();
    }

    /** @return list<array<string, mixed>> */
    public function pendingReports(Mosque $mosque): array
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

    /** @return list<array<string, mixed>> */
    public function recentContent(Mosque $mosque): array
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
                    ->orWhere(fn ($q) => $q->where('reportable_type', 'campaign')->whereIn('reportable_id', $campaignIds))
                    ->orWhere(fn ($q) => $q->where('reportable_type', 'lost_found')->whereIn('reportable_id', $mosque->lostFoundItems()->select('id')));
            });
    }

    /** @return array<string, mixed> */
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
