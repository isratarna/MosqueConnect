<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\PrayerTime;
use App\Services\PrayerCalculator;
use App\Services\PrayerScheduleService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class CalculatedPrayerTimesTest extends TestCase
{
    use RefreshDatabase;

    private const BAITUL_MUKARRAM = ['latitude' => 23.7296, 'longitude' => 90.4125];

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_calculated_adhan_times_match_the_islamic_foundation_timetable_for_dhaka(): void
    {
        // Islamic Foundation Bangladesh, Dhaka, Friday 2 October 2026.
        $timetable = [
            PrayerTime::PRAYER_FAJR => '04:36',
            PrayerTime::PRAYER_DHUHR => '11:49',
            PrayerTime::PRAYER_ASR => '16:06',
            PrayerTime::PRAYER_MAGHRIB => '17:48',
            PrayerTime::PRAYER_ISHA => '19:01',
        ];

        $times = app(PrayerCalculator::class)->calculate(
            self::BAITUL_MUKARRAM['latitude'],
            self::BAITUL_MUKARRAM['longitude'],
            '2026-10-02',
        );

        $this->assertSame(PrayerTime::PRAYERS, array_keys($times));

        foreach ($timetable as $prayer => $expected) {
            $difference = abs($this->minutes($times[$prayer]['adhan_time']) - $this->minutes($expected));

            $this->assertLessThanOrEqual(
                2,
                $difference,
                "{$prayer} was calculated as {$times[$prayer]['adhan_time']}, expected {$expected} ±2 minutes.",
            );
        }
    }

    public function test_jamaat_is_estimated_from_the_configured_offsets(): void
    {
        config(['prayer.jamaat_offsets.maghrib' => 7, 'prayer.adjustments.maghrib' => 0]);

        $times = app(PrayerCalculator::class)->calculate(
            self::BAITUL_MUKARRAM['latitude'],
            self::BAITUL_MUKARRAM['longitude'],
            '2026-10-02',
        );

        $this->assertSame(
            7,
            $this->minutes($times['maghrib']['jamaat_time']) - $this->minutes($times['maghrib']['adhan_time']),
        );
    }

    public function test_mosque_without_published_times_returns_five_calculated_prayers(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-02 08:00', 'Asia/Dhaka'));
        $mosque = Mosque::factory()->create(self::BAITUL_MUKARRAM);

        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonCount(5, 'data.prayer_schedule')
            ->assertJsonPath('data.prayer_schedule.0.prayer', 'fajr')
            ->assertJsonPath('data.prayer_schedule.0.source', 'calculated')
            ->assertJsonPath('data.prayer_schedule.4.prayer', 'isha')
            ->assertJsonPath('data.prayer_sources', [
                'Fajr' => 'calculated',
                'Dhuhr' => 'calculated',
                'Asr' => 'calculated',
                'Maghrib' => 'calculated',
                'Isha' => 'calculated',
            ])
            ->assertJsonPath('data.prayer.Maghrib', '17:53');

        $this->getJson('/api/mosques/nearby?latitude=23.73&longitude=90.41')
            ->assertOk()
            ->assertJsonCount(5, 'data.0.prayer')
            ->assertJsonPath('data.0.prayer_sources.Fajr', 'calculated');

        $this->getJson("/api/mosques/{$mosque->id}/prayer-schedule")
            ->assertOk()
            ->assertJsonPath('data.date', '2026-10-02')
            ->assertJsonCount(5, 'data.prayer_schedule')
            ->assertJsonPath('data.prayer_schedule.1.adhan_time', '11:49')
            ->assertJsonPath('data.prayer_schedule.1.source', 'calculated')
            ->assertJsonPath('data.prayer_schedule.1.id', null);
    }

    public function test_published_times_always_override_calculated_ones(): void
    {
        $mosque = Mosque::factory()->create(self::BAITUL_MUKARRAM);
        PrayerTime::factory()->create([
            'mosque_id' => $mosque->id,
            'prayer' => PrayerTime::PRAYER_DHUHR,
            'adhan_time' => '12:45:00',
            'jamaat_time' => '13:15:00',
        ]);

        $schedule = collect(app(PrayerScheduleService::class)->forDate(
            $mosque->load('prayerTimes'),
            CarbonImmutable::parse('2026-10-02', 'Asia/Dhaka'),
        ))->keyBy('prayer');

        $this->assertCount(5, $schedule);
        $this->assertSame('mosque', $schedule['dhuhr']['source']);
        $this->assertSame('12:45', $schedule['dhuhr']['adhan_time']);
        $this->assertSame('13:15', $schedule['dhuhr']['jamaat_time']);

        foreach (['fajr', 'asr', 'maghrib', 'isha'] as $prayer) {
            $this->assertSame('calculated', $schedule[$prayer]['source']);
        }

        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('data.prayer.Dhuhr', '13:15')
            ->assertJsonPath('data.prayer_sources.Dhuhr', 'mosque')
            ->assertJsonPath('data.prayer_sources.Asr', 'calculated');
    }

    public function test_fully_published_mosques_are_not_calculated(): void
    {
        $mosque = Mosque::factory()->create(self::BAITUL_MUKARRAM);
        foreach (PrayerTime::PRAYERS as $prayer) {
            PrayerTime::factory()->create(['mosque_id' => $mosque->id, 'prayer' => $prayer]);
        }

        $this->mock(PrayerCalculator::class)->shouldNotReceive('forMosque');

        $schedule = app(PrayerScheduleService::class)->forDate($mosque->load('prayerTimes'));

        $this->assertSame(['mosque'], array_values(array_unique(array_column($schedule, 'source'))));
    }

    public function test_calculated_times_are_cached_per_mosque_and_date_until_midnight(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-02 22:00', 'Asia/Dhaka'));
        $mosque = Mosque::factory()->create(self::BAITUL_MUKARRAM);
        $calculator = app(PrayerCalculator::class);

        $first = $calculator->forMosque($mosque, CarbonImmutable::now('Asia/Dhaka'));

        $this->assertSame($first, Cache::get("prayer-calc:{$mosque->id}:2026-10-02")['times']);

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-03 00:01', 'Asia/Dhaka'));
        $this->assertNull(Cache::get("prayer-calc:{$mosque->id}:2026-10-02"));
    }

    public function test_moving_a_mosque_recalculates_its_times(): void
    {
        $date = CarbonImmutable::parse('2026-10-02', 'Asia/Dhaka');
        $mosque = Mosque::factory()->create(self::BAITUL_MUKARRAM);
        $calculator = app(PrayerCalculator::class);

        $dhaka = $calculator->forMosque($mosque, $date);

        // Sylhet is far enough east that sunset is several minutes earlier.
        $mosque->update(['latitude' => 24.8949, 'longitude' => 91.8687]);
        $sylhet = $calculator->forMosque($mosque->fresh(), $date);

        $this->assertNotSame($dhaka['maghrib'], $sylhet['maghrib']);
    }

    private function minutes(string $time): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', $time));

        return $hours * 60 + $minutes;
    }
}
