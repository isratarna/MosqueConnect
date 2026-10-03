<?php

use App\Models\Campaign;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::call(function (): void {
    Campaign::query()
        ->where('status', Campaign::STATUS_ACTIVE)
        ->whereDate('ends_on', '<', today())
        ->update(['status' => Campaign::STATUS_EXPIRED, 'updated_at' => now()]);
})->hourly()->name('expire-ended-campaigns')->withoutOverlapping();

Schedule::command('lost-found:close-stale')->daily()->name('close-stale-lost-found')->withoutOverlapping();
Schedule::command('prayer-schedules:notify-starting-periods')->dailyAt('18:00')->name('notify-upcoming-prayer-schedules')->withoutOverlapping();
Schedule::command('announcements:publish-scheduled')->everyFiveMinutes()->name('publish-scheduled-announcements')->withoutOverlapping();
Schedule::command('events:send-reminders')->dailyAt('18:00')->timezone('Asia/Dhaka')->name('send-event-reminders')->withoutOverlapping();
Schedule::command('volunteers:send-reminders')->dailyAt('18:00')->timezone('Asia/Dhaka')->name('send-volunteer-reminders')->withoutOverlapping();

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
