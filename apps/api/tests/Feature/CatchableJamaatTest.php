<?php

namespace Tests\Feature;

use App\Models\JumuahSession;
use App\Models\Mosque;
use App\Models\PrayerTime;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatchableJamaatTest extends TestCase
{
    use RefreshDatabase;

    // Gulshan-er kache ekta jayga; mosque gula ekhan theke purbe boshano.
    private const HERE = ['lat' => 23.7925, 'lng' => 90.4078];

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_it_lists_feasible_jamaats_sorted_by_jamaat_time(): void
    {
        $this->at('2026-10-03 16:00');
        $near = $this->mosqueEastBy(400, ['asr' => '16:15'], 'Gulshan Central');
        $further = $this->mosqueEastBy(1000, ['asr' => '16:20'], 'Niketan Jame');
        $this->mosqueEastBy(2000, ['asr' => '16:10'], 'Too Far');

        $response = $this->getJson('/api/mosques/catchable?'.http_build_query(self::HERE + ['mode' => 'walk']))
            ->assertOk()
            ->assertJsonPath('next', null);

        // 400 m × 1.3 ÷ 4.5 km/h ≈ 7 min; 2 km er ta 35 min, tai bad.
        $this->assertSame([$near->id, $further->id], array_column(array_column($response->json('data'), 'mosque'), 'id'));
        $this->assertSame('Asr', $response->json('data.0.label'));
        $this->assertSame(7, $response->json('data.0.travel_min'));
        $this->assertSame(8, $response->json('data.0.wait_min'));
        $this->assertTrue($response->json('data.0.feasible'));
        $this->assertSame('mosque', $response->json('data.0.source'));
    }

    public function test_driving_reaches_mosques_that_are_too_far_to_walk(): void
    {
        $this->at('2026-10-03 16:00');
        $far = $this->mosqueEastBy(2000, ['asr' => '16:12']);

        $this->getJson('/api/mosques/catchable?'.http_build_query(self::HERE + ['mode' => 'walk']))
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/mosques/catchable?'.http_build_query(self::HERE + ['mode' => 'drive']))
            ->assertOk()
            ->assertJsonPath('data.0.mosque.id', $far->id);
    }

    public function test_when_nothing_is_feasible_it_returns_the_next_jamaat(): void
    {
        $this->at('2026-10-03 16:12');
        $this->mosqueEastBy(2000, ['asr' => '16:15']);

        $response = $this->getJson('/api/mosques/catchable?'.http_build_query(self::HERE + ['mode' => 'walk']))
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('next.label', 'Maghrib')
            ->assertJsonPath('next.source', 'calculated')
            ->assertJsonPath('next.estimated', true);

        $this->assertMatchesRegularExpression('/^Next: Maghrib at \d{1,2}:\d{2} PM in 1h \d+m$/', $response->json('next.message'));
    }

    public function test_friday_dhuhr_uses_the_first_jumuah_session(): void
    {
        $this->at('2026-10-02 12:30');
        $mosque = $this->mosqueEastBy(300, ['dhuhr' => '13:30']);
        JumuahSession::factory()->create(['mosque_id' => $mosque->id, 'sequence' => 2, 'jamaat_time' => '14:00']);
        JumuahSession::factory()->create(['mosque_id' => $mosque->id, 'sequence' => 1, 'jamaat_time' => '13:15']);

        $this->getJson('/api/mosques/catchable?'.http_build_query(self::HERE))
            ->assertOk()
            ->assertJsonPath('data.0.label', 'Jumuah')
            ->assertJsonPath('data.0.jamaat_at', '2026-10-02T13:15:00+06:00');
    }

    public function test_location_is_required(): void
    {
        $this->getJson('/api/mosques/catchable?mode=walk')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lat', 'lng']);

        $this->getJson('/api/mosques/catchable?'.http_build_query(self::HERE + ['mode' => 'fly']))
            ->assertJsonValidationErrors(['mode']);
    }

    private function at(string $time): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse($time, 'Asia/Dhaka'));
        $this->travelTo(CarbonImmutable::parse($time, 'Asia/Dhaka'));
    }

    /** @param array<string, string> $jamaats */
    private function mosqueEastBy(int $metres, array $jamaats, ?string $name = null): Mosque
    {
        $mosque = Mosque::factory()->create([
            'name' => $name ?? 'Test Mosque '.$metres,
            'latitude' => self::HERE['lat'],
            'longitude' => self::HERE['lng'] + $metres / (111320 * cos(deg2rad(self::HERE['lat']))),
        ]);

        foreach ($jamaats as $prayer => $time) {
            PrayerTime::factory()->create(['mosque_id' => $mosque->id, 'prayer' => $prayer, 'adhan_time' => $time, 'jamaat_time' => $time]);
        }

        return $mosque;
    }
}
