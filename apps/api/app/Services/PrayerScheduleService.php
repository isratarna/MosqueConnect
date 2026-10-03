<?php

namespace App\Services;

use App\Models\Mosque;
use App\Models\PrayerTime;
use App\Support\ClockTime;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

class PrayerScheduleService
{
    public const SOURCE_MOSQUE = 'mosque';

    public const SOURCE_CALCULATED = 'calculated';

    public function __construct(private readonly PrayerCalculator $calculator) {}

    /**
     * The five daily prayers for a mosque on a date.
     *
     * Times the mosque published win. Any prayer it has not published is
     * filled from the calculator and marked as calculated, so every mosque
     * with a valid location returns all five prayers.
     *
     * @return list<array{id: int|null, prayer: string, label: string, adhan_time: string|null, jamaat_time: string|null, source: string}>
     */
    public function forDate(Mosque $mosque, ?CarbonInterface $date = null): array
    {
        $date ??= CarbonImmutable::now(config('prayer.timezone'));
        $published = $mosque->prayerTimes->keyBy('prayer');
        $calculated = null;
        $schedule = [];

        foreach (PrayerTime::PRAYERS as $prayer) {
            $time = $published->get($prayer);

            if ($time) {
                $schedule[] = [
                    'id' => $time->id,
                    'prayer' => $prayer,
                    'label' => PrayerTime::PRAYER_LABELS[$prayer],
                    'adhan_time' => ClockTime::format($time->adhan_time),
                    'jamaat_time' => ClockTime::format($time->jamaat_time),
                    'source' => self::SOURCE_MOSQUE,
                ];

                continue;
            }

            if (! $this->hasValidCoordinates($mosque)) {
                continue;
            }

            $calculated ??= $this->calculator->forMosque($mosque, $date);

            if (! isset($calculated[$prayer])) {
                continue;
            }

            $schedule[] = [
                'id' => null,
                'prayer' => $prayer,
                'label' => PrayerTime::PRAYER_LABELS[$prayer],
                'adhan_time' => $calculated[$prayer]['adhan_time'],
                'jamaat_time' => $calculated[$prayer]['jamaat_time'],
                'source' => self::SOURCE_CALCULATED,
            ];
        }

        return $schedule;
    }

    private function hasValidCoordinates(Mosque $mosque): bool
    {
        if (! is_numeric($mosque->latitude) || ! is_numeric($mosque->longitude)) {
            return false;
        }

        $latitude = (float) $mosque->latitude;
        $longitude = (float) $mosque->longitude;

        return $latitude >= -90 && $latitude <= 90 && $longitude >= -180 && $longitude <= 180;
    }
}
