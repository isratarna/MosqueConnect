<?php

namespace App\Services\Journey;

use App\Models\Mosque;
use App\Models\PrayerTime;
use App\Services\PrayerScheduleService;
use App\Support\ClockTime;
use App\Support\Geo;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * "Kon jamaat ta dhorte parbo?" engine. Ekta position, somoy ar mode (walk/drive)
 * diye prottek mosque-er porer jamaat, pouchanor somoy, wait ar feasible kina
 * hishab kore. Journey planner-o ei class er jamaat ar mosque helper use kore.
 */
class ReachabilityService
{
    public function __construct(private readonly PrayerScheduleService $schedules) {}

    /**
     * Home card-er jonno: feasible option gula (jamaat time, tarpor travel time
     * onujayi sort). Kichu feasible na thakle "next" e porer dhora-jay emon jamaat.
     *
     * @param  iterable<Mosque>  $mosques
     * @return array{options: list<array<string, mixed>>, next: array<string, mixed>|null}
     */
    public function catchable(float $lat, float $lng, string $mode, CarbonImmutable $now, iterable $mosques): array
    {
        $options = [];
        $later = [];

        foreach ($mosques as $mosque) {
            $distanceKm = Geo::distanceKm($lat, $lng, (float) $mosque->latitude, (float) $mosque->longitude);
            $travelMin = $this->travelMinutes($distanceKm, $mode);
            $arriveAt = $now->addSeconds((int) round($travelMin * 60));

            // Ei mosque-er shamner duita jamaat: prothom ta dhorte na parle
            // porer ta "next" hishebe kaje lage.
            $upcoming = $this->upcomingJamaats($mosque, $now, 2);

            foreach ($upcoming as $index => $jamaat) {
                $option = $this->option($mosque, $jamaat, $distanceKm, $travelMin, $arriveAt);

                if ($index === 0 && $option['feasible']) {
                    $options[] = $option;
                    break;
                }

                if ($index > 0 && $option['feasible']) {
                    $later[] = $option;
                }
            }
        }

        $sort = fn (array $a, array $b): int => [$a['jamaat_at'], $a['travel_min']] <=> [$b['jamaat_at'], $b['travel_min']];
        usort($options, $sort);
        usort($later, $sort);

        $next = null;
        if ($options === [] && $later !== []) {
            $next = $later[0];
            $next['message'] = $this->nextMessage($next, $now);
        }

        return [
            'options' => array_slice($options, 0, (int) config('journey.catchable.limit', 3)),
            'next' => $next,
        ];
    }

    /**
     * Rasta-r durotto × road factor ÷ mode-er speed = koto minute lagbe.
     */
    public function travelMinutes(float $distanceKm, string $mode): float
    {
        $speed = (float) config("journey.speeds_kmh.{$mode}", config('journey.speeds_kmh.drive'));

        return $distanceKm * (float) config('journey.road_factor', 1.3) / $speed * 60;
    }

    /**
     * Pouchanor somoy + buffer (2 min) jamaat-er age ba thik shomoy hole dhora jabe.
     */
    public static function isFeasible(CarbonInterface $arriveAt, CarbonInterface $jamaatAt, ?int $bufferMin = null): bool
    {
        $buffer = $bufferMin ?? (int) config('journey.buffer_min', 2);

        return $arriveAt->getTimestamp() + $buffer * 60 <= $jamaatAt->getTimestamp();
    }

    /**
     * Ekta din-er jamaat gula (published, na thakle calculated). Shukrobar Dhuhr
     * er jaygay prothom Jumuah session dhori, jodi mosque ta Jumuah dey.
     *
     * @return list<array{prayer: string, label: string, jamaat_at: CarbonImmutable, source: string}>
     */
    public function jamaatsOn(Mosque $mosque, CarbonInterface $day): array
    {
        $timezone = config('prayer.timezone');
        $day = CarbonImmutable::instance($day)->setTimezone($timezone)->startOfDay();
        $jamaats = [];

        foreach ($this->schedules->forDate($mosque, $day) as $row) {
            $time = $row['jamaat_time'];
            $label = $row['label'];
            $source = $row['source'];

            if ($row['prayer'] === PrayerTime::PRAYER_DHUHR && $day->isFriday()) {
                $session = $mosque->jumuahSessions->first(fn ($session) => filled($session->jamaat_time));
                if ($session) {
                    $time = ClockTime::format($session->jamaat_time);
                    $label = 'Jumuah';
                    $source = PrayerScheduleService::SOURCE_MOSQUE;
                }
            }

            if (! $time) {
                continue;
            }

            $jamaats[] = [
                'prayer' => $row['prayer'],
                'label' => $label,
                'jamaat_at' => CarbonImmutable::createFromFormat('Y-m-d H:i', $day->toDateString().' '.$time, $timezone),
                'source' => $source,
            ];
        }

        return $jamaats;
    }

    /**
     * $now er pore shamner $count ta jamaat (aaj-er baki gula, tarpor kal-er).
     *
     * @return list<array{prayer: string, label: string, jamaat_at: CarbonImmutable, source: string}>
     */
    public function upcomingJamaats(Mosque $mosque, CarbonImmutable $now, int $count): array
    {
        $upcoming = [];

        foreach ([$now, $now->addDay()] as $day) {
            foreach ($this->jamaatsOn($mosque, $day) as $jamaat) {
                if ($jamaat['jamaat_at']->greaterThan($now)) {
                    $upcoming[] = $jamaat;
                }

                if (count($upcoming) >= $count) {
                    return $upcoming;
                }
            }
        }

        return $upcoming;
    }

    /**
     * Response-e mosque-er je tuku dorkar.
     *
     * @return array<string, mixed>
     */
    public static function mosqueSummary(Mosque $mosque): array
    {
        return [
            'id' => $mosque->id,
            'name' => $mosque->name,
            'address' => $mosque->address,
            'area' => $mosque->area,
            'district' => $mosque->district,
            'lat' => (float) $mosque->latitude,
            'lng' => (float) $mosque->longitude,
            'verified' => $mosque->isVerified(),
            'rating' => $mosque->rating_avg !== null ? (float) $mosque->rating_avg : null,
            'facilities' => $mosque->facilities->pluck('facility_key')->values()->all(),
        ];
    }

    /**
     * @param  array{prayer: string, label: string, jamaat_at: CarbonImmutable, source: string}  $jamaat
     * @return array<string, mixed>
     */
    private function option(Mosque $mosque, array $jamaat, float $distanceKm, float $travelMin, CarbonImmutable $arriveAt): array
    {
        return [
            'mosque' => self::mosqueSummary($mosque),
            'prayer' => $jamaat['prayer'],
            'label' => $jamaat['label'],
            'jamaat_at' => $jamaat['jamaat_at']->toIso8601String(),
            'distance_km' => round($distanceKm, 2),
            'travel_min' => (int) ceil($travelMin),
            'arrive_at' => $arriveAt->toIso8601String(),
            'wait_min' => intdiv($jamaat['jamaat_at']->getTimestamp() - $arriveAt->getTimestamp(), 60),
            'feasible' => self::isFeasible($arriveAt, $jamaat['jamaat_at']),
            'source' => $jamaat['source'],
            'estimated' => $jamaat['source'] === PrayerScheduleService::SOURCE_CALCULATED,
        ];
    }

    /** "Next: Maghrib at 5:52 PM in 1h 20m" type er lekha. */
    private function nextMessage(array $option, CarbonImmutable $now): string
    {
        $jamaatAt = CarbonImmutable::parse($option['jamaat_at'])->setTimezone(config('prayer.timezone'));
        $minutes = max(0, intdiv($jamaatAt->getTimestamp() - $now->getTimestamp(), 60));
        $in = $minutes >= 60 ? intdiv($minutes, 60).'h '.($minutes % 60).'m' : $minutes.' min';

        return "Next: {$option['label']} at {$jamaatAt->format('g:i A')} in {$in}";
    }
}
