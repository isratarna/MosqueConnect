<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\Event;
use App\Models\GoodsDonation;
use App\Models\Mosque;
use App\Models\PrayerTime;
use App\Support\ClockTime;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * One read-only query per mosque admin dashboard card.
 */
class DashboardQueryService
{
    public const FOLLOWER_GROWTH_WEEKS = 8;

    public function __construct(private readonly PrayerScheduleService $prayerSchedule) {}

    /**
     * Today's five prayers, any Jumuah sessions and the next jamaat after now.
     *
     * @return array<string, mixed>
     */
    public function todayPrayers(Mosque $mosque): array
    {
        $now = CarbonImmutable::now(config('prayer.timezone'));
        $mosque->loadMissing(['prayerTimes', 'jumuahSessions', 'schedulePeriods.prayerTimes']);

        $schedule = $this->prayerSchedule->forDate($mosque, $now);
        $jumuah = $mosque->jumuahSessions
            ->map(fn ($session): array => [
                'sequence' => $session->sequence,
                'label' => $session->label,
                'khutbah_time' => ClockTime::format($session->khutbah_time),
                'jamaat_time' => ClockTime::format($session->jamaat_time),
            ])
            ->values()
            ->all();

        return [
            'date' => $now->toDateString(),
            'is_friday' => $now->isFriday(),
            'schedule' => array_map(fn (array $entry): array => array_diff_key($entry, ['id' => true]), $schedule),
            'jumuah_sessions' => $jumuah,
            'next_jamaat' => $this->nextJamaat($schedule, $now->isFriday() ? $jumuah : [], $now->format('H:i')),
        ];
    }

    /**
     * The next five published events, with registrations against capacity.
     *
     * @return list<array<string, mixed>>
     */
    public function upcomingEvents(Mosque $mosque, int $limit = 5): array
    {
        return $mosque->events()
            ->published()
            ->whereDate('event_date', '>=', today())
            ->withCount('registrations')
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->map(fn (Event $event): array => [
                'id' => $event->id,
                'title' => $event->title,
                'event_date' => $event->event_date?->toDateString(),
                'start_time' => ClockTime::format($event->start_time),
                'location' => $event->location,
                'registration_required' => $event->registration_required,
                'registrations_count' => (int) $event->registrations_count,
                'capacity' => $event->capacity,
            ])
            ->values()
            ->all();
    }

    /**
     * Campaigns that are currently running, ending soonest first.
     *
     * @return list<array<string, mixed>>
     */
    public function activeCampaigns(Mosque $mosque, int $limit = 5): array
    {
        return $mosque->campaigns()
            ->where('status', Campaign::STATUS_ACTIVE)
            ->orderBy('ends_on')
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->map(function (Campaign $campaign): array {
                $raised = (float) $campaign->raised_amount;
                $target = (float) $campaign->target_amount;

                return [
                    'id' => $campaign->id,
                    'title' => $campaign->title,
                    'raised_amount' => $raised,
                    'target_amount' => $target,
                    'currency' => $campaign->currency,
                    'progress_percentage' => $target > 0 ? round(min(100, ($raised / $target) * 100), 2) : 0,
                    'ends_on' => $campaign->ends_on?->toDateString(),
                    'days_left' => $campaign->ends_on ? max(0, (int) today()->diffInDays($campaign->ends_on, false)) : null,
                    'moderation_status' => $campaign->moderation_status,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Number of campaign donations the admin still has to confirm or reject.
     */
    public function pendingPledgesCount(Mosque $mosque): int
    {
        return $this->pendingPledgesQuery($mosque)->count();
    }

    /**
     * Number of goods pledges the admin still has to accept or decline.
     */
    public function pendingGoodsDonationsCount(Mosque $mosque): int
    {
        return $mosque->goodsDonations()->where('status', GoodsDonation::STATUS_PENDING)->count();
    }

    /**
     * Number of complaints that are open or being worked on.
     */
    public function openComplaintsCount(Mosque $mosque): int
    {
        return $mosque->complaints()->open()->count();
    }

    /**
     * The oldest campaign donations still waiting for the admin, so they are handled in order.
     *
     * Goods pledges will join this list once the community hub (#239) adds them.
     *
     * @return list<array<string, mixed>>
     */
    public function pendingPledges(Mosque $mosque, int $limit = 10): array
    {
        return $this->pendingPledgesQuery($mosque)
            ->with('campaign:id,title,currency')
            ->orderBy('created_at')
            ->orderBy('id')
            ->limit($limit)
            ->get()
            ->map(fn (CampaignDonation $donation): array => [
                'id' => $donation->id,
                'kind' => 'campaign_donation',
                'campaign_id' => $donation->campaign_id,
                'campaign_title' => $donation->campaign?->title,
                'donor_name' => $donation->is_anonymous ? null : $donation->donor_name,
                'is_anonymous' => $donation->is_anonymous,
                'amount' => (float) $donation->amount,
                'currency' => $donation->campaign?->currency,
                'payment_method' => $donation->payment_method,
                'reference' => $donation->reference,
                'created_at' => $donation->created_at?->toJSON(),
            ])
            ->values()
            ->all();
    }

    /**
     * New followers per week for the last eight weeks, oldest week first.
     *
     * Counts come from one query grouped by day, which works the same on
     * MySQL and SQLite, and are then summed into seven-day buckets ending today.
     *
     * @return list<array{week_start: string, week_end: string, count: int}>
     */
    public function followerGrowth(Mosque $mosque): array
    {
        $today = Carbon::today();
        $start = $today->copy()->subDays(self::FOLLOWER_GROWTH_WEEKS * 7 - 1);

        $perDay = $mosque->followers()
            ->toBase()
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->where('created_at', '>=', $start)
            ->groupBy('day')
            ->pluck('total', 'day');

        $weeks = [];
        for ($week = 0; $week < self::FOLLOWER_GROWTH_WEEKS; $week++) {
            $weekStart = $start->copy()->addDays($week * 7);
            $count = 0;
            for ($day = 0; $day < 7; $day++) {
                $count += (int) ($perDay[$weekStart->copy()->addDays($day)->toDateString()] ?? 0);
            }

            $weeks[] = [
                'week_start' => $weekStart->toDateString(),
                'week_end' => $weekStart->copy()->addDays(6)->toDateString(),
                'count' => $count,
            ];
        }

        return $weeks;
    }

    /**
     * How complete the public profile is, with a checklist of what is missing.
     *
     * @return array{percentage: int, items: list<array{key: string, label: string, done: bool, section: string}>}
     */
    public function profileCompleteness(Mosque $mosque): array
    {
        $publishedPrayers = $mosque->prayerTimes()->whereNotNull('jamaat_time')->distinct()->count('prayer');

        $items = [
            ['key' => 'photo', 'label' => 'Cover photo', 'done' => filled($mosque->photo_path), 'section' => 'profile'],
            ['key' => 'phone', 'label' => 'Phone number', 'done' => filled($mosque->phone), 'section' => 'profile'],
            ['key' => 'description', 'label' => 'Description', 'done' => filled($mosque->description), 'section' => 'profile'],
            ['key' => 'facilities', 'label' => 'Facilities', 'done' => $mosque->facilities()->exists(), 'section' => 'facilities'],
            ['key' => 'prayer_times', 'label' => 'All five prayer times', 'done' => $publishedPrayers >= count(PrayerTime::PRAYERS), 'section' => 'prayer'],
            ['key' => 'location', 'label' => 'Map location', 'done' => $this->hasLocation($mosque), 'section' => 'profile'],
            ['key' => 'jumuah', 'label' => 'Jumuah time', 'done' => $mosque->jumuahSessions()->exists(), 'section' => 'jummah'],
        ];

        $done = count(array_filter($items, fn (array $item): bool => $item['done']));

        return [
            'percentage' => (int) round($done / count($items) * 100),
            'items' => $items,
        ];
    }

    /**
     * @return Builder<CampaignDonation>
     */
    private function pendingPledgesQuery(Mosque $mosque)
    {
        return CampaignDonation::query()
            ->where('status', CampaignDonation::STATUS_PENDING)
            ->whereIn('campaign_id', $mosque->campaigns()->select('id'));
    }

    /**
     * First jamaat later today, or tomorrow's Fajr once Isha has passed.
     * On Fridays the Jumuah sessions take Dhuhr's place.
     *
     * @param  list<array<string, mixed>>  $schedule
     * @param  list<array<string, mixed>>  $jumuah
     * @return array{prayer: string, label: string, jamaat_time: string, tomorrow: bool}|null
     */
    private function nextJamaat(array $schedule, array $jumuah, string $now): ?array
    {
        $candidates = [];
        foreach ($schedule as $entry) {
            if ($entry['prayer'] === PrayerTime::PRAYER_DHUHR && $jumuah !== []) {
                foreach ($jumuah as $session) {
                    $candidates[] = ['prayer' => 'jumuah', 'label' => $session['label'], 'jamaat_time' => $session['jamaat_time']];
                }

                continue;
            }

            $candidates[] = ['prayer' => $entry['prayer'], 'label' => $entry['label'], 'jamaat_time' => $entry['jamaat_time']];
        }

        $candidates = array_values(array_filter($candidates, fn (array $item): bool => filled($item['jamaat_time'])));
        usort($candidates, fn (array $a, array $b): int => strcmp($a['jamaat_time'], $b['jamaat_time']));

        foreach ($candidates as $candidate) {
            if ($candidate['jamaat_time'] > $now) {
                return [...$candidate, 'tomorrow' => false];
            }
        }

        $fajr = collect($schedule)->firstWhere('prayer', PrayerTime::PRAYER_FAJR);

        return $fajr && filled($fajr['jamaat_time'])
            ? ['prayer' => $fajr['prayer'], 'label' => $fajr['label'], 'jamaat_time' => $fajr['jamaat_time'], 'tomorrow' => true]
            : null;
    }

    private function hasLocation(Mosque $mosque): bool
    {
        return is_numeric($mosque->latitude) && is_numeric($mosque->longitude)
            && ((float) $mosque->latitude !== 0.0 || (float) $mosque->longitude !== 0.0);
    }
}
