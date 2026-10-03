<?php

namespace App\Services;

use App\Models\Mosque;
use App\Models\PrayerTime;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use DateTime;
use DateTimeZone;
use Illuminate\Support\Facades\Cache;
use IslamicNetwork\PrayerTimes\PrayerTimes;

class PrayerCalculator
{
    /** Library result keys for each stored prayer name. */
    private const LIBRARY_KEYS = [
        PrayerTime::PRAYER_FAJR => PrayerTimes::FAJR,
        PrayerTime::PRAYER_DHUHR => PrayerTimes::ZHUHR,
        PrayerTime::PRAYER_ASR => PrayerTimes::ASR,
        PrayerTime::PRAYER_MAGHRIB => PrayerTimes::MAGHRIB,
        PrayerTime::PRAYER_ISHA => PrayerTimes::ISHA,
    ];

    /**
     * Calculated adhan times and estimated jamaat times for a mosque.
     *
     * Results are cached per mosque and date until the next midnight in the
     * prayer timezone, since a nearby list can contain hundreds of mosques.
     * The cached coordinates are compared on read so a moved mosque is
     * recalculated straight away.
     *
     * @return array<string, array{adhan_time: string, jamaat_time: string}>
     */
    public function forMosque(Mosque $mosque, CarbonInterface $date): array
    {
        $timezone = config('prayer.timezone');
        $day = CarbonImmutable::instance($date)->setTimezone($timezone)->toDateString();
        $coordinates = [(float) $mosque->latitude, (float) $mosque->longitude];
        $key = "prayer-calc:{$mosque->id}:{$day}";

        $cached = Cache::get($key);
        if (is_array($cached) && ($cached['coordinates'] ?? null) === $coordinates) {
            return $cached['times'];
        }

        $times = $this->calculate($coordinates[0], $coordinates[1], $day);
        Cache::put($key, [
            'coordinates' => $coordinates,
            'times' => $times,
        ], CarbonImmutable::now($timezone)->addDay()->startOfDay());

        return $times;
    }

    /**
     * @return array<string, array{adhan_time: string, jamaat_time: string}>
     */
    public function calculate(float $latitude, float $longitude, string $day): array
    {
        $timezone = config('prayer.timezone');
        $calculator = new PrayerTimes(config('prayer.method'), config('prayer.asr_school'));
        $raw = $calculator->getTimes(new DateTime($day, new DateTimeZone($timezone)), $latitude, $longitude);

        $times = [];

        foreach (self::LIBRARY_KEYS as $prayer => $libraryKey) {
            $value = $raw[$libraryKey] ?? null;

            // The library returns a placeholder when a time does not occur,
            // such as Isha during polar summers.
            if (! is_string($value) || ! preg_match('/^\d{2}:\d{2}$/', $value)) {
                continue;
            }

            $adhan = CarbonImmutable::createFromFormat('Y-m-d H:i', "{$day} {$value}", $timezone)
                ->addMinutes((int) config("prayer.adjustments.{$prayer}", 0));

            $times[$prayer] = [
                'adhan_time' => $adhan->format('H:i'),
                'jamaat_time' => $adhan->addMinutes((int) config("prayer.jamaat_offsets.{$prayer}", 0))->format('H:i'),
            ];
        }

        return $times;
    }
}
