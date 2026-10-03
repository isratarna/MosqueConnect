<?php

namespace App\Services\Journey;

use App\Models\PrayerTime;
use App\Services\PrayerCalculator;
use Carbon\CarbonImmutable;

/**
 * Journey-r moddhe kon kon namaz pore sheta ber kore. Lomba route-e jaygar
 * sathe namaz-er time bodlay, tai prottek namaz-er shuru-r somoy oi jaygay
 * hishab kori jekhane ami oi somoy thakbo.
 */
class PrayerWindowResolver
{
    public function __construct(private readonly PrayerCalculator $calculator) {}

    /**
     * Ekta namaz-er window = tar shuru theke porer namaz-er shuru porjonto.
     * Window ta [depart, arrive] er sathe overlap korlei namaz ta relevant.
     * Midnight paar hole ager din ar porer din-er time-o dekhi.
     *
     * @param  list<array{lat: float, lng: float, cum_distance_m: float, eta_s: float}>  $route
     * @return list<array{prayer: string, label: string, starts_at: CarbonImmutable, ends_at: CarbonImmutable, lat: float, lng: float}>
     */
    public function resolve(array $route, CarbonImmutable $departAt, CarbonImmutable $arriveAt): array
    {
        $timezone = config('prayer.timezone');
        $day = $departAt->setTimezone($timezone)->startOfDay()->subDay();
        $lastDay = $arriveAt->setTimezone($timezone)->startOfDay()->addDay();
        $starts = [];

        for (; $day->lessThanOrEqualTo($lastDay); $day = $day->addDay()) {
            foreach (PrayerTime::PRAYERS as $prayer) {
                $start = $this->startAlongRoute($route, $departAt, $prayer, $day);
                if ($start !== null) {
                    $starts[] = $start;
                }
            }
        }

        usort($starts, fn (array $a, array $b): int => $a['starts_at'] <=> $b['starts_at']);

        $windows = [];
        for ($i = 0; $i < count($starts) - 1; $i++) {
            $window = $starts[$i] + ['ends_at' => $starts[$i + 1]['starts_at']];

            if ($window['starts_at']->lessThan($arriveAt) && $window['ends_at']->greaterThan($departAt)) {
                $windows[] = $window;
            }
        }

        return $windows;
    }

    /**
     * Prothome origin-e namaz-er time ber kori, tarpor oi somoy route-er je
     * jaygay thakbo shekhane abar hishab kori. 2-3 bar korle time thir hoye jay.
     *
     * @param  list<array{lat: float, lng: float, cum_distance_m: float, eta_s: float}>  $route
     * @return array{prayer: string, label: string, starts_at: CarbonImmutable, lat: float, lng: float}|null
     */
    private function startAlongRoute(array $route, CarbonImmutable $departAt, string $prayer, CarbonImmutable $day): ?array
    {
        $timezone = config('prayer.timezone');
        $point = $route[0];
        $startsAt = null;

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $times = $this->calculator->calculate($point['lat'], $point['lng'], $day->toDateString());
            if (! isset($times[$prayer])) {
                return null;
            }

            $startsAt = CarbonImmutable::createFromFormat('Y-m-d H:i', $day->toDateString().' '.$times[$prayer]['adhan_time'], $timezone);
            $next = RouteGeometry::pointAtTime($route, $startsAt->getTimestamp() - $departAt->getTimestamp());

            // Notun jayga ager tar 1 km er moddhe hole ar bodlabe na.
            if (RouteGeometry::distanceM([$point['lat'], $point['lng']], [$next['lat'], $next['lng']]) < 1000) {
                break;
            }

            $point = $next;
        }

        $label = PrayerTime::PRAYER_LABELS[$prayer];
        if ($prayer === PrayerTime::PRAYER_DHUHR && $startsAt->isFriday()) {
            $label = 'Jumuah';
        }

        return [
            'prayer' => $prayer,
            'label' => $label,
            'starts_at' => $startsAt,
            'lat' => $point['lat'],
            'lng' => $point['lng'],
        ];
    }
}
