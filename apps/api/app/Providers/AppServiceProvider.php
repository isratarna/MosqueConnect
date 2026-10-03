<?php

namespace App\Providers;

use App\Models\Announcement;
use App\Models\BloodRequest;
use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\Complaint;
use App\Models\Event;
use App\Models\GoodsDonation;
use App\Models\JumuahSession;
use App\Models\LostFoundItem;
use App\Models\Mosque;
use App\Models\PrayerTime;
use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use App\Observers\AdminActivityObserver;
use App\Policies\AnnouncementPolicy;
use App\Policies\BloodRequestPolicy;
use App\Policies\ComplaintPolicy;
use App\Policies\EventPolicy;
use App\Policies\GoodsDonationPolicy;
use App\Policies\LostFoundItemPolicy;
use App\Policies\MosquePolicy;
use App\Policies\VolunteerOpportunityPolicy;
use App\Services\ClaimReview\ClaimDocumentReviewer;
use App\Services\ClaimReview\DocumentAiClaimReviewer;
use App\Services\ClaimReview\GoogleDocumentAiClient;
use App\Services\Journey\GeoapifyRoutingClient;
use App\Services\Journey\RoutesClient;
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

        $this->app->bind(GoogleDocumentAiClient::class, fn () => new GoogleDocumentAiClient(config('services.google_document_ai', [])));
        $this->app->bind(ClaimDocumentReviewer::class, DocumentAiClaimReviewer::class);
        $this->app->bind(RoutesClient::class, fn () => new GeoapifyRoutingClient(
            config('services.geoapify.key'),
            (int) config('services.geoapify.timeout', 15),
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Announcement::class, AnnouncementPolicy::class);
        Gate::policy(BloodRequest::class, BloodRequestPolicy::class);
        Gate::policy(Complaint::class, ComplaintPolicy::class);
        Gate::policy(Event::class, EventPolicy::class);
        Gate::policy(GoodsDonation::class, GoodsDonationPolicy::class);
        Gate::policy(LostFoundItem::class, LostFoundItemPolicy::class);
        Gate::policy(Mosque::class, MosquePolicy::class);
        Gate::policy(VolunteerOpportunity::class, VolunteerOpportunityPolicy::class);

        foreach ([Mosque::class, PrayerTime::class, JumuahSession::class, Announcement::class, Event::class, Campaign::class, CampaignDonation::class, VolunteerOpportunity::class, VolunteerApplication::class] as $model) {
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

        // Journey plan routing API call kore (credit khoroch hoy), tai guest
        // ghontay 5 ta, login kora user dine 20 ta plan korte pare.
        RateLimiter::for('journey-plan', function (Request $request) {
            $user = $request->user('sanctum');
            $limits = config('journey.plan.throttle');
            $message = $user
                ? "You can plan up to {$limits['user_per_day']} journeys a day. Please try again tomorrow."
                : "You can plan up to {$limits['guest_per_hour']} journeys an hour. Log in to plan more.";

            $limit = $user
                ? Limit::perDay((int) $limits['user_per_day'])->by('journey|user|'.$user->id)
                : Limit::perHour((int) $limits['guest_per_hour'])->by('journey|ip|'.$request->ip());

            return $limit->response(fn () => response()->json(['message' => $message], 429));
        });

        // Blood requests are time-critical and public, so one person may only
        // post a few a day.
        RateLimiter::for('blood-requests', function (Request $request) {
            $limit = (int) config('blood.daily_request_limit', 5);

            return Limit::perDay($limit)
                ->by('blood-request|'.($request->user()?->id ?? $request->ip()))
                ->response(fn () => response()->json([
                    'message' => "You can post up to {$limit} blood requests a day. Please try again tomorrow.",
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
