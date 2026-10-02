<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Mosque;
use App\Models\MosqueDailyStat;
use App\Models\Notification;
use Carbon\CarbonImmutable;

/**
 * Usage numbers for a mosque admin: profile views, direction and call taps,
 * follows, and how many followers read each announcement.
 */
class MosqueInsightsService
{
    public const RANGES = ['7d' => 7, '30d' => 30, '90d' => 90];

    /**
     * @return array<string, mixed>
     */
    public function forRange(Mosque $mosque, string $range = '30d'): array
    {
        $days = self::RANGES[$range] ?? self::RANGES['30d'];
        $to = CarbonImmutable::parse(MosqueDailyStat::today());
        $from = $to->subDays($days - 1);

        $rows = $mosque->dailyStats()
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->get()
            ->keyBy(fn (MosqueDailyStat $stat): string => $stat->date->toDateString());

        $series = [];
        $totals = array_fill_keys(MosqueDailyStat::COUNTERS, 0);
        for ($date = $from; $date->lte($to); $date = $date->addDay()) {
            $row = $rows->get($date->toDateString());
            $point = ['date' => $date->toDateString()];
            foreach (MosqueDailyStat::COUNTERS as $counter) {
                $point[$counter] = (int) ($row?->{$counter} ?? 0);
                $totals[$counter] += $point[$counter];
            }
            $series[] = $point;
        }

        $announcements = $this->announcementReach($mosque, $from);
        $delivered = array_sum(array_column($announcements, 'delivered'));
        $read = array_sum(array_column($announcements, 'read'));

        return [
            'range' => array_search($days, self::RANGES, true),
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'totals' => [
                ...$totals,
                'net_follows' => $totals['follows'] - $totals['unfollows'],
                'followers_count' => $mosque->followers()->count(),
                'notifications_delivered' => $delivered,
                'notifications_read' => $read,
                'announcement_read_rate' => $delivered > 0 ? round($read / $delivered * 100, 1) : null,
            ],
            'series' => $series,
            'announcements' => $announcements,
        ];
    }

    /**
     * Per announcement published in the range: notifications the follower
     * fan-out created, and how many of those have been read.
     *
     * @return list<array<string, mixed>>
     */
    private function announcementReach(Mosque $mosque, CarbonImmutable $from): array
    {
        $announcements = $mosque->announcements()
            ->where('status', Announcement::STATUS_PUBLISHED)
            ->where('published_at', '>=', $from->startOfDay())
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit(20)
            ->get(['id', 'title', 'published_at']);

        if ($announcements->isEmpty()) {
            return [];
        }

        $reach = Notification::query()
            ->toBase()
            ->selectRaw('reference_id, COUNT(*) as delivered, SUM(CASE WHEN is_read THEN 1 ELSE 0 END) as read_count')
            ->where('mosque_id', $mosque->id)
            ->where('reference_type', Notification::REFERENCE_ANNOUNCEMENT)
            ->whereIn('reference_id', $announcements->pluck('id'))
            ->groupBy('reference_id')
            ->get()
            ->keyBy('reference_id');

        return $announcements
            ->map(function (Announcement $announcement) use ($reach): array {
                $row = $reach->get($announcement->id);
                $delivered = (int) ($row->delivered ?? 0);
                $read = (int) ($row->read_count ?? 0);

                return [
                    'id' => $announcement->id,
                    'title' => $announcement->title,
                    'published_at' => $announcement->published_at?->toJSON(),
                    'delivered' => $delivered,
                    'read' => $read,
                    'read_rate' => $delivered > 0 ? round($read / $delivered * 100, 1) : null,
                ];
            })
            ->values()
            ->all();
    }
}
