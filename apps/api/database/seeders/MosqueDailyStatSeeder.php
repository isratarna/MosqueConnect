<?php

namespace Database\Seeders;

use App\Models\Mosque;
use App\Models\MosqueDailyStat;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

/**
 * Demo usage counters for the last 90 days, so the dashboard's Insights
 * section has something to show. The numbers repeat on every run.
 */
class MosqueDailyStatSeeder extends Seeder
{
    public function run(): void
    {
        $today = CarbonImmutable::parse(MosqueDailyStat::today());

        Mosque::query()
            ->whereNotNull('owner_id')
            ->where('verification_status', Mosque::VERIFICATION_VERIFIED)
            ->pluck('id')
            ->each(function (int $mosqueId) use ($today): void {
                mt_srand($mosqueId);
                $rows = [];

                for ($daysAgo = 89; $daysAgo >= 0; $daysAgo--) {
                    $date = $today->subDays($daysAgo);
                    $views = mt_rand(8, 30) + ($date->isFriday() ? 25 : 0);

                    $rows[] = [
                        'mosque_id' => $mosqueId,
                        'date' => $date->toDateString(),
                        'profile_views' => $views,
                        'direction_clicks' => intdiv($views, mt_rand(3, 6)),
                        'call_clicks' => mt_rand(0, 3),
                        'follows' => mt_rand(0, 4),
                        'unfollows' => mt_rand(0, 10) > 8 ? 1 : 0,
                    ];
                }

                MosqueDailyStat::query()->upsert($rows, ['mosque_id', 'date'], MosqueDailyStat::COUNTERS);
            });

        mt_srand();
    }
}
