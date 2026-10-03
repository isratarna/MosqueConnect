<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\MosqueFacility;
use App\Models\PrayerTime;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MosqueSearchContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_issue_bounds_and_women_area_example_filters_server_side(): void
    {
        $insideWithFacility = $this->createMosque('Inside with women area', 23.75, 90.40);
        MosqueFacility::factory()->create([
            'mosque_id' => $insideWithFacility->id,
            'facility_key' => MosqueFacility::WOMEN_AREA,
        ]);
        $this->createMosque('Inside without facility', 23.80, 90.43);
        $outsideWithFacility = $this->createMosque('Outside with women area', 23.90, 90.50);
        MosqueFacility::factory()->create([
            'mosque_id' => $outsideWithFacility->id,
            'facility_key' => MosqueFacility::WOMEN_AREA,
        ]);

        $this->getJson('/api/mosques?bounds=23.70%2C90.35%2C23.85%2C90.45&facilities%5B%5D=women_area&per_page=50')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $insideWithFacility->id)
            ->assertJsonPath('meta.per_page', 50);
    }

    public function test_search_eager_loads_facilities_and_prayer_times_for_ten_mosques(): void
    {
        foreach (range(1, 10) as $index) {
            $this->createMosque("Search Mosque {$index}", 23.75 + ($index / 1000), 90.40);
        }

        DB::flushQueryLog();
        DB::enableQueryLog();
        try {
            $this->getJson('/api/mosques?per_page=50')
                ->assertOk()
                ->assertJsonCount(10, 'data');
            $queryCount = count(DB::getQueryLog());
        } finally {
            DB::disableQueryLog();
        }

        $this->assertLessThanOrEqual(6, $queryCount);
    }

    private function createMosque(string $name, float $latitude, float $longitude): Mosque
    {
        $mosque = Mosque::factory()->create([
            'name' => $name,
            'latitude' => $latitude,
            'longitude' => $longitude,
        ]);

        foreach (PrayerTime::PRAYERS as $index => $prayer) {
            PrayerTime::factory()->create([
                'mosque_id' => $mosque->id,
                'prayer' => $prayer,
                'adhan_time' => sprintf('%02d:00:00', 4 + $index),
                'jamaat_time' => sprintf('%02d:15:00', 4 + $index),
            ]);
        }

        return $mosque;
    }
}
