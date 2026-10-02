<?php

namespace App\Providers;

use App\Models\Announcement;
use App\Models\BloodRequest;
use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\Event;
use App\Models\JumuahSession;
use App\Models\Mosque;
use App\Models\PrayerTime;
use App\Models\VolunteerOpportunity;
use App\Observers\AdminActivityObserver;
use App\Policies\AnnouncementPolicy;
use App\Policies\BloodRequestPolicy;
use App\Policies\EventPolicy;
use App\Policies\MosquePolicy;
use App\Policies\VolunteerOpportunityPolicy;
use App\Services\Otp\LogSmsOtpSender;
use App\Services\Otp\MissingSmsOtpSender;
use App\Services\Otp\SmsOtpSender;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(SmsOtpSender::class, fn () => match (config('otp.sms.driver')) {
            'log' => new LogSmsOtpSender,
            default => new MissingSmsOtpSender,
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Announcement::class, AnnouncementPolicy::class);
        Gate::policy(BloodRequest::class, BloodRequestPolicy::class);
        Gate::policy(Event::class, EventPolicy::class);
        Gate::policy(Mosque::class, MosquePolicy::class);
        Gate::policy(VolunteerOpportunity::class, VolunteerOpportunityPolicy::class);

        foreach ([Mosque::class, PrayerTime::class, JumuahSession::class, Announcement::class, Event::class, Campaign::class, CampaignDonation::class, VolunteerOpportunity::class] as $model) {
            $model::observe(AdminActivityObserver::class);
        }

        RateLimiter::for('otp-send', function (Request $request) {
            return Limit::perMinute((int) config('otp.throttle.send_per_minute', 5))
                ->by($request->input('phone', $request->ip()));
        });

        RateLimiter::for('otp-verify', function (Request $request) {
            return Limit::perMinute((int) config('otp.throttle.verify_per_minute', 10))
                ->by($request->input('phone', $request->ip()));
        });

        // Each person may suggest a limited number of corrections per day.
        RateLimiter::for('suggestions', function (Request $request) {
            $limit = (int) config('suggestions.daily_limit', 10);

            return Limit::perDay($limit)
                ->by('suggestions|'.($request->user()?->id ?? $request->ip()))
                ->response(fn () => response()->json([
                    'message' => "You can suggest up to {$limit} corrections a day. Please try again tomorrow.",
                ], 429));
        });

        // Usage tracking is public, so each IP may count at most 30 events per mosque per hour.
        RateLimiter::for('mosque-track', function (Request $request) {
            $mosque = $request->route('mosque');
            $mosqueId = $mosque instanceof Mosque ? $mosque->getKey() : $mosque;

            return Limit::perHour(30)->by($request->ip().'|'.$mosqueId);
        });
    }
}
