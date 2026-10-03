<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Services\Queries\MosqueQueryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MosqueQueryServiceSqliteTest extends TestCase
{
    use RefreshDatabase;

    public function test_sqlite_nearby_results_are_sorted_by_distance(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            $this->markTestSkipped('Run this test with DB_CONNECTION=sqlite.');
        }

        $this->assertSame('sqlite', DB::connection()->getDriverName());

        $far = Mosque::factory()->create([
            'latitude' => 23.80,
            'longitude' => 90.45,
        ]);
        $near = Mosque::factory()->create([
            'latitude' => 23.7501,
            'longitude' => 90.4001,
        ]);

        $results = app(MosqueQueryService::class)->nearby(23.75, 90.40, 20);

        $this->assertSame([$near->id, $far->id], $results->pluck('id')->all());
        $this->assertLessThan($results[1]->distance_km, $results[0]->distance_km);
    }
}
