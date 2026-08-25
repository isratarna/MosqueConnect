<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\Event;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\PrayerTime;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use RuntimeException;

class DemoDataIntegritySeeder extends Seeder
{
    public function run(): void
    {
        $this->ensure(
            User::query()->where('role', User::ROLE_MOSQUE_ADMIN)->whereDoesntHave('ownedMosques')->doesntExist(),
            'Every mosque admin must own at least one mosque.',
        );
        $this->ensure(Mosque::query()->whereNull('owner_id')->doesntExist(), 'Every demo mosque must have an owner.');

        $this->ensure(
            ! Event::query()
                ->join('mosques', 'events.mosque_id', '=', 'mosques.id')
                ->whereColumn('events.created_by', '!=', 'mosques.owner_id')
                ->exists(),
            'Every demo event must be created by its mosque owner.',
        );
        $this->ensure(
            ! Campaign::query()
                ->join('mosques', 'campaigns.mosque_id', '=', 'mosques.id')
                ->whereColumn('campaigns.created_by', '!=', 'mosques.owner_id')
                ->exists(),
            'Every demo campaign must be created by its mosque owner.',
        );

        $this->ensure(CampaignDonation::query()->whereNull('user_id')->doesntExist(), 'Every demo donation must have a donor.');
        $this->ensure(
            CampaignDonation::query()
                ->where('status', CampaignDonation::STATUS_CONFIRMED)
                ->where(fn ($query) => $query->whereNull('confirmed_by')->orWhereNull('confirmed_at'))
                ->doesntExist(),
            'Every confirmed donation must record its confirmer and confirmation time.',
        );

        Campaign::query()->with('donations')->get()->each(function (Campaign $campaign): void {
            $confirmed = $campaign->donations
                ->where('status', CampaignDonation::STATUS_CONFIRMED)
                ->sum(fn (CampaignDonation $donation): float => (float) $donation->amount);

            $this->ensure(
                round((float) $campaign->raised_amount, 2) === round($confirmed, 2),
                "Campaign {$campaign->id} raised_amount does not match confirmed donations.",
            );
        });

        Mosque::query()
            ->where('verification_status', Mosque::VERIFICATION_VERIFIED)
            ->withCount(['prayerTimes', 'jumuahSessions'])
            ->get()
            ->each(function (Mosque $mosque): void {
                $this->ensure($mosque->prayer_times_count === 5, "Verified mosque {$mosque->id} needs all five prayer times.");
                $this->ensure($mosque->jumuah_sessions_count >= 1, "Verified mosque {$mosque->id} needs a Jumuah session.");
            });

        Notification::query()->get()->each(function (Notification $notification): void {
            $this->ensure(
                Follower::query()
                    ->where('user_id', $notification->user_id)
                    ->where('mosque_id', $notification->mosque_id)
                    ->exists(),
                "Notification {$notification->id} recipient does not follow its mosque.",
            );

            $referenceExists = match ($notification->reference_type) {
                Notification::REFERENCE_EVENT => Event::query()->whereKey($notification->reference_id)->exists(),
                Notification::REFERENCE_ANNOUNCEMENT => Announcement::query()->whereKey($notification->reference_id)->exists(),
                Notification::REFERENCE_CAMPAIGN => Campaign::query()->whereKey($notification->reference_id)->exists(),
                Notification::REFERENCE_PRAYER_SCHEDULE => PrayerTime::query()->whereKey($notification->reference_id)->exists(),
                null => $notification->reference_id === null,
                default => false,
            };

            $this->ensure($referenceExists, "Notification {$notification->id} has an invalid reference.");
        });

        $this->ensureStatuses(Mosque::class, 'verification_status', Mosque::VERIFICATION_STATUSES);
        $this->ensureStatuses(VerificationRequest::class, 'status', ['pending', 'ai_reviewed', 'under_human_review', 'approved', 'rejected']);
        $this->ensureStatuses(Event::class, 'status', Event::STATUSES);
        $this->ensureStatuses(Campaign::class, 'status', Campaign::STATUSES);
        $this->ensureStatuses(CampaignDonation::class, 'status', CampaignDonation::STATUSES);

        $this->ensure(
            Event::query()->where('status', Event::STATUS_PUBLISHED)->whereDate('event_date', '<', today())->exists()
                && Event::query()->where('status', Event::STATUS_PUBLISHED)->whereDate('event_date', '>=', today())->exists(),
            'The demo must contain both past and upcoming published events.',
        );
    }

    /** @param class-string<Model> $model */
    private function ensureStatuses(string $model, string $column, array $statuses): void
    {
        foreach ($statuses as $status) {
            $this->ensure(
                $model::query()->where($column, $status)->exists(),
                "The demo dataset is missing {$model} status '{$status}'.",
            );
        }
    }

    private function ensure(bool $condition, string $message): void
    {
        if (! $condition) {
            throw new RuntimeException('Demo data integrity check failed: '.$message);
        }
    }
}
