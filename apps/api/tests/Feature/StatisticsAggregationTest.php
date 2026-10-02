<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StatisticsAggregationTest extends TestCase
{
    use RefreshDatabase;

    public function test_statistics_endpoint_uses_at_most_five_queries(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]));

        DB::flushQueryLog();
        DB::enableQueryLog();
        try {
            $this->getJson('/api/super-admin/statistics')
                ->assertOk()
                ->assertJsonStructure(['data' => ['monthly', 'content', 'moderation']]);
            $queryCount = count(DB::getQueryLog());
        } finally {
            DB::disableQueryLog();
        }

        $this->assertLessThanOrEqual(5, $queryCount);
    }
}
