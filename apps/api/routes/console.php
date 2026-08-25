<?php

use App\Models\Campaign;
use Illuminate\Support\Facades\Schedule;

Schedule::call(function (): void {
    Campaign::query()
        ->where('status', Campaign::STATUS_ACTIVE)
        ->whereDate('ends_on', '<', today())
        ->update(['status' => Campaign::STATUS_EXPIRED, 'updated_at' => now()]);
})->hourly()->name('expire-ended-campaigns')->withoutOverlapping();
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
