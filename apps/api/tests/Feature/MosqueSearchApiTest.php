<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\MosqueFacility;
use App\Models\PrayerTime;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MosqueSearchApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_works_without_coordinates_and_returns_pagination_and_listing_fields(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = $this->mosque([
            'name' => 'Gulshan Community Mosque',
            'address' => 'Road 63, Gulshan 2',
            'district' => 'Dhaka',
            'area' => 'Gulshan',
            'owner_id' => $owner->id,
        ]);
        $this->mosque([
            'name' => 'Dhanmondi Mosque',
            'address' => 'Road 1, Dhanmondi',
            'district' => 'Dhaka',
            'area' => 'Dhanmondi',
        ]);

        $this->getJson('/api/mosques?search=gulshan')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $mosque->id)
            ->assertJsonPath('data.0.district', 'Dhaka')
            ->assertJsonPath('data.0.area', 'Gulshan')
            ->assertJsonPath('data.0.rating', null)
            ->assertJsonPath('data.0.reviews_count', 0)
            ->assertJsonPath('data.0.has_admin', true)
            ->assertJsonPath('data.0.photo_url', null);
    }

    public function test_facility_filters_require_every_requested_facility(): void
    {
        $matching = $this->mosque(['name' => 'Matching Mosque']);
        $partial = $this->mosque(['name' => 'Partial Mosque']);
        foreach ([MosqueFacility::WOMEN_AREA, MosqueFacility::PARKING] as $key) {
            MosqueFacility::factory()->create(['mosque_id' => $matching->id, 'facility_key' => $key]);
        }
        MosqueFacility::factory()->create(['mosque_id' => $partial->id, 'facility_key' => MosqueFacility::WOMEN_AREA]);

        $this->getJson('/api/mosques?facilities%5B%5D=women_area&facilities%5B%5D=parking')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $matching->id);
    }

    public function test_bounds_filter_and_distance_sort_apply_server_side(): void
    {
        $near = $this->locatedMosque('Near Mosque', 23.75, 90.40);
        $far = $this->locatedMosque('Far Mosque', 23.82, 90.44);
        $outside = $this->locatedMosque('Outside Mosque', 23.90, 90.50);

        $this->getJson('/api/mosques?bounds=23.70,90.35,23.85,90.45&lat=23.75&lng=90.40&sort=distance')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $near->id)
            ->assertJsonPath('data.1.id', $far->id)
            ->assertJsonStructure(['data' => [['distance_km']], 'links', 'meta']);

        $this->assertNotContains($outside->id, collect($this->getJson('/api/mosques?bounds=23.70,90.35,23.85,90.45')->json('data'))->pluck('id')->all());
    }

    public function test_pagination_returns_standard_meta_and_links(): void
    {
        foreach (range(1, 3) as $number) {
            $this->mosque(['name' => "Mosque {$number}"]);
        }

        $this->getJson('/api/mosques?per_page=2&page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonStructure(['links' => ['first', 'last', 'prev', 'next']]);
    }

    public function test_invalid_bounds_and_distance_sort_without_coordinates_are_rejected(): void
    {
        $this->getJson('/api/mosques?bounds=23.9,90.4,23.7,90.5')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('bounds');

        $this->getJson('/api/mosques?sort=distance')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('sort');
    }

    public function test_filters_endpoint_returns_distinct_district_area_groups_in_one_query(): void
    {
        $this->mosque(['district' => 'Dhaka', 'area' => 'Gulshan']);
        $this->mosque(['district' => 'Dhaka', 'area' => 'Gulshan']);
        $this->mosque(['district' => 'Dhaka', 'area' => 'Dhanmondi']);

        DB::flushQueryLog();
        DB::enableQueryLog();
        try {
            $response = $this->getJson('/api/mosques/filters')->assertOk();
            $queryCount = count(DB::getQueryLog());
        } finally {
            DB::disableQueryLog();
        }

        $response->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.district', 'Dhaka')
            ->assertJsonPath('data.0.areas', ['Dhanmondi', 'Gulshan']);
        $this->assertSame(1, $queryCount);
    }

    private function mosque(array $attributes = []): Mosque
    {
        $mosque = Mosque::factory()->create(array_merge([
            'latitude' => 0,
            'longitude' => 0,
            'address' => '1 Example Road',
            'district' => 'Test District',
            'area' => 'Test Area',
        ], $attributes));

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

    private function locatedMosque(string $name, float $latitude, float $longitude): Mosque
    {
        $mosque = $this->mosque([
            'name' => $name,
            'latitude' => $latitude,
            'longitude' => $longitude,
        ]);

        return $mosque;
    }
}
