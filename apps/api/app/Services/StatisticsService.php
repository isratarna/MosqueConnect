<?php

namespace App\Services;

use App\Models\CampaignDonation;
use App\Models\Event;
use App\Models\Mosque;
use App\Models\User;
use App\Models\VolunteerApplication;
use Illuminate\Support\Facades\Cache;

/**
 * Platform-wide numbers, such as the impact stats on the home page.
 */
class StatisticsService
{
    public const PUBLIC_CACHE_KEY = 'public-stats';

    public const PUBLIC_CACHE_SECONDS = 600;

    /**
     * @return array<string, int|float>
     */
    public function publicStats(): array
    {
        return Cache::remember(self::PUBLIC_CACHE_KEY, self::PUBLIC_CACHE_SECONDS, fn (): array => [
            'mosques_count' => Mosque::query()->count(),
            'verified_mosques_count' => Mosque::query()->where('verification_status', Mosque::VERIFICATION_VERIFIED)->count(),
            'members_count' => User::query()
                ->where('role', User::ROLE_NORMAL_USER)
                ->where('account_status', User::STATUS_ACTIVE)
                ->count(),
            'donations_confirmed_total' => (float) CampaignDonation::query()
                ->where('status', CampaignDonation::STATUS_CONFIRMED)
                ->sum('amount'),
            // Pending and accepted applications; rejected and cancelled ones are left out.
            'volunteer_signups_count' => VolunteerApplication::query()->whereIn('status', VolunteerApplication::ACTIVE_STATUSES)->count(),
            'events_held_count' => Event::query()->published()->whereDate('event_date', '<', today())->count(),
        ]);
    }
}
