<?php

namespace Tests\Unit;

use App\Models\Mosque;
use App\Models\MosqueFacility;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MosqueQueryScopesTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_scope_matches_name_address_area_and_district(): void
    {
        $name = Mosque::factory()->create(['name' => 'Al Noor Mosque', 'address' => 'Street Alpha', 'area' => 'Area Alpha', 'district' => 'District Alpha']);
        $address = Mosque::factory()->create(['name' => 'Second Mosque', 'address' => 'Gulshan Avenue', 'area' => 'Area Beta', 'district' => 'District Beta']);
        $area = Mosque::factory()->create(['name' => 'Third Mosque', 'address' => 'Street Gamma', 'area' => 'Dhanmondi', 'district' => 'District Gamma']);
        $district = Mosque::factory()->create(['name' => 'Fourth Mosque', 'address' => 'Street Delta', 'area' => 'Area Delta', 'district' => 'Chattogram']);

        $this->assertSame([$name->id], Mosque::query()->search('Noor')->pluck('id')->all());
        $this->assertSame([$address->id], Mosque::query()->search('Avenue')->pluck('id')->all());
        $this->assertSame([$area->id], Mosque::query()->search('Dhanmondi')->pluck('id')->all());
        $this->assertSame([$district->id], Mosque::query()->search('Chattogram')->pluck('id')->all());
    }

    public function test_facility_scope_uses_and_semantics_and_location_scopes_match_values(): void
    {
        $matching = Mosque::factory()->create(['district' => 'Dhaka', 'area' => 'Gulshan']);
        $partial = Mosque::factory()->create(['district' => 'Dhaka', 'area' => 'Gulshan']);
        foreach ([MosqueFacility::WOMEN_AREA, MosqueFacility::PARKING] as $key) {
            MosqueFacility::factory()->create(['mosque_id' => $matching->id, 'facility_key' => $key]);
        }
        MosqueFacility::factory()->create(['mosque_id' => $partial->id, 'facility_key' => MosqueFacility::WOMEN_AREA]);

        $ids = Mosque::query()
            ->withFacilities([MosqueFacility::WOMEN_AREA, MosqueFacility::PARKING])
            ->inDistrict('Dhaka')
            ->inArea('Gulshan')
            ->pluck('id')
            ->all();

        $this->assertSame([$matching->id], $ids);
    }
}
