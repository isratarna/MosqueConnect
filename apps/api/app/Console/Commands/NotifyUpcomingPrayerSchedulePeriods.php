<?php

namespace App\Console\Commands;

use App\Models\PrayerSchedulePeriod;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class NotifyUpcomingPrayerSchedulePeriods extends Command
{
    protected $signature = 'prayer-schedules:notify-starting-periods';

    protected $description = 'Notify mosque followers about schedule periods starting tomorrow';

    public function handle(NotificationService $notifications): int
    {
        PrayerSchedulePeriod::query()
            ->whereDate('starts_on', today()->addDay())
            ->with('mosque')
            ->chunkById(100, function ($periods) use ($notifications): void {
                foreach ($periods as $period) {
                    $notifications->notifySchedulePeriodStarting($period);
                }
            });

        return self::SUCCESS;
    }
}
