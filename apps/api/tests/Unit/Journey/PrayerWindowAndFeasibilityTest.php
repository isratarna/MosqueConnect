<?php

namespace Tests\Unit\Journey;

use App\Services\Journey\PrayerWindowResolver;
use App\Services\Journey\ReachabilityService;
use App\Services\PrayerCalculator;
use Carbon\CarbonImmutable;
use Tests\TestCase;

class PrayerWindowAndFeasibilityTest extends TestCase
{
    public function test_feasibility_early_exact_and_late(): void
    {
        $jamaat = CarbonImmutable::parse('2026-10-03 16:30:00', 'Asia/Dhaka');

        // Age pouchale feasible, thik 2 min age-o feasible, er pore na.
        $this->assertTrue(ReachabilityService::isFeasible($jamaat->subMinutes(10), $jamaat));
        $this->assertTrue(ReachabilityService::isFeasible($jamaat->subMinutes(2), $jamaat));
        $this->assertFalse(ReachabilityService::isFeasible($jamaat->subMinutes(2)->addSecond(), $jamaat));
        $this->assertFalse(ReachabilityService::isFeasible($jamaat->addMinute(), $jamaat));
    }

    public function test_travel_minutes_use_the_road_factor_and_mode_speed(): void
    {
        $service = app(ReachabilityService::class);

        // 1 km × 1.3 ÷ 4.5 km/h = 17.3 min hete; ÷ 20 km/h = 3.9 min gari-te.
        $this->assertEqualsWithDelta(17.33, $service->travelMinutes(1, 'walk'), 0.01);
        $this->assertEqualsWithDelta(3.9, $service->travelMinutes(1, 'drive'), 0.01);
    }

    public function test_prayer_windows_across_midnight(): void
    {
        // Dhaka-te raat 10 tay rowna, sokal 6 tay pouchano (eki jaygay thaka route).
        $route = [
            ['lat' => 23.7296, 'lng' => 90.4125, 'cum_distance_m' => 0.0, 'eta_s' => 0.0],
            ['lat' => 23.7296, 'lng' => 90.4225, 'cum_distance_m' => 1000.0, 'eta_s' => 8 * 3600.0],
        ];
        $departAt = CarbonImmutable::parse('2026-10-03 22:00', 'Asia/Dhaka');
        $arriveAt = $departAt->addHours(8);

        $windows = app(PrayerWindowResolver::class)->resolve($route, $departAt, $arriveAt);

        $this->assertSame(['isha', 'fajr'], array_column($windows, 'prayer'));

        // Isha ager din shuru hoye porer din Fajr-e shesh.
        $this->assertSame('2026-10-03', $windows[0]['starts_at']->toDateString());
        $this->assertSame('2026-10-04', $windows[0]['ends_at']->toDateString());
        $this->assertTrue($windows[0]['ends_at']->equalTo($windows[1]['starts_at']));
        $this->assertSame('2026-10-04', $windows[1]['starts_at']->toDateString());
    }

    public function test_prayer_start_shifts_along_a_long_route(): void
    {
        // Purbe gele Maghrib age hoy. Route ta Dhaka theke ~200 km purbe.
        $route = [
            ['lat' => 23.73, 'lng' => 90.41, 'cum_distance_m' => 0.0, 'eta_s' => 0.0],
            ['lat' => 23.73, 'lng' => 92.37, 'cum_distance_m' => 200000.0, 'eta_s' => 4 * 3600.0],
        ];
        $departAt = CarbonImmutable::parse('2026-10-03 15:00', 'Asia/Dhaka');

        $windows = collect(app(PrayerWindowResolver::class)->resolve($route, $departAt, $departAt->addHours(4)))->keyBy('prayer');
        $calculated = app(PrayerCalculator::class)->calculate(23.73, 90.41, '2026-10-03');

        $this->assertTrue($windows->has('maghrib'));
        // Route-er upor Maghrib Dhaka-r cheye kichu minute age.
        $this->assertLessThan($calculated['maghrib']['adhan_time'], $windows['maghrib']['starts_at']->format('H:i'));
        $this->assertGreaterThan(90.41, $windows['maghrib']['lng']);
    }
}
