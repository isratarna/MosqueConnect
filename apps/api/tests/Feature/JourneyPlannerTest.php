<?php

namespace Tests\Feature;

use App\Models\JourneyPlan;
use App\Models\Mosque;
use App\Models\MosqueFacility;
use App\Models\PrayerTime;
use App\Models\User;
use App\Services\Journey\FakeRoutesClient;
use App\Services\Journey\GeoapifyRoutingClient;
use App\Services\Journey\RoutesClient;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Stored Dhaka -> Comilla route (tests/Fixtures/routes/dhaka-comilla.json) diye
 * planner test. Shonibar 3 Oct 2026, 3:00 PM e rowna; trip ~128 min, tai Dhuhr
 * (already cholche) ar Asr (~4:04 PM theke) trip-er moddhe pore.
 */
class JourneyPlannerTest extends TestCase
{
    use RefreshDatabase;

    private FakeRoutesClient $routes;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo(CarbonImmutable::parse('2026-10-03 15:00', 'Asia/Dhaka'));
        $this->routes = FakeRoutesClient::fromFixture('dhaka-comilla');
        $this->app->instance(RoutesClient::class, $this->routes);
    }

    public function test_it_plans_prayers_along_the_route_with_ranked_stops(): void
    {
        // Eliotganj: ~4:13 PM e pass kori, Asr 4:30 -> feasible, wait ~13 min.
        $eliotganj = $this->mosque('Eliotganj Jame Masjid', 23.5095, 90.8200, '16:30', verified: true);
        // Gouripur: ~4:27 PM e pass, 4:30 er jamaat dhora jay na.
        $gouripur = $this->mosque('Gouripur Masjid', 23.4765, 90.9050, '16:30');
        // Daudkandi: ~3:57 PM e pass, 4:30 porjonto wait onek beshi -> delay beshi.
        $daudkandi = $this->mosque('Daudkandi Masjid', 23.5315, 90.7150, '16:30');
        // Route theke 20 km dure: corridor-er baire.
        $this->mosque('Far Away Masjid', 23.70, 90.80, '16:30');

        $response = $this->postJson('/api/journeys/plan', $this->payload())->assertCreated();

        $this->assertSame(['dhuhr', 'asr'], array_column($response->json('prayers'), 'prayer'));

        $asr = $response->json('prayers.1');
        $this->assertSame('ok', $asr['status']);
        $ids = array_column(array_column($asr['options'], 'mosque'), 'id');
        $this->assertSame([$eliotganj->id, $daudkandi->id], $ids);
        $this->assertNotContains($gouripur->id, $ids);

        $best = $asr['options'][0];
        $this->assertTrue($best['feasible']);
        $this->assertTrue($best['refined']);
        $this->assertGreaterThan(0, $best['wait_min']);
        $this->assertLessThan(300, $best['off_route_m']);
        $this->assertSame('mosque', $best['source']);
        $this->assertEqualsWithDelta($best['detour_min'] + $best['wait_min'] + 15, $best['delay_min'], 1);

        // Dhuhr-er jamaat (12:17 calculated) chole geche: none_reachable, kintu window ar kacher mosque dei.
        $dhuhr = $response->json('prayers.0');
        $this->assertSame('none_reachable', $dhuhr['status']);
        $this->assertSame('Gulistan', $dhuhr['window']['near_label']);
        $this->assertNotEmpty($dhuhr['options']);
        $this->assertFalse($dhuhr['options'][0]['feasible']);

        $this->assertSame(88692, $response->json('route.distance_m'));
        $this->assertSame(7663, $response->json('route.duration_s'));
        $this->assertStringContainsString('waypoints=23.5095%2C90.82', $response->json('maps_url'));
        $this->assertStringStartsWith('https://www.google.com/maps/dir/?api=1&origin=23.723%2C90.412', $response->json('maps_url'));

        // 1 ta route call, Asr-er top 3 er jonno 2 ta chhoto matrix (Dhuhr-e kichu feasible nei).
        $this->assertSame(1, $this->routes->routeCalls);
        $this->assertSame(2, $this->routes->matrixCalls);
        $this->assertTrue($this->routes->requests[0]['trafficAware']);
        $this->assertDatabaseHas('journey_plans', ['id' => $response->json('id'), 'routing_calls' => 3]);
    }

    public function test_requested_facilities_break_ties_in_the_ranking(): void
    {
        // Eki jaygay duita mosque, eki jamaat: rating beshi wala age, jodi na
        // traveller women_area chay.
        $rated = $this->mosque('Rated Masjid', 23.5095, 90.8200, '16:30');
        $rated->forceFill(['rating_avg' => 4.8])->save();
        $womenArea = $this->mosque('Women Area Masjid', 23.5095, 90.8200, '16:30');
        MosqueFacility::factory()->create(['mosque_id' => $womenArea->id, 'facility_key' => MosqueFacility::WOMEN_AREA]);

        $plain = $this->postJson('/api/journeys/plan', $this->payload())->assertCreated();
        $this->assertSame($rated->id, $plain->json('prayers.1.options.0.mosque.id'));

        $filtered = $this->postJson('/api/journeys/plan', $this->payload(['facilities' => ['women_area']]))->assertCreated();
        $this->assertSame($womenArea->id, $filtered->json('prayers.1.options.0.mosque.id'));
        $this->assertSame(['women_area'], $filtered->json('prayers.1.options.0.mosque.facilities'));
    }

    public function test_a_prayer_with_no_reachable_mosque_is_none_reachable(): void
    {
        // Ekmatro mosque, jar Asr jamaat amra pouchanor anek age.
        $this->mosque('Early Masjid', 23.4870, 91.0050, '16:10');

        $response = $this->postJson('/api/journeys/plan', $this->payload())->assertCreated();

        $asr = $response->json('prayers.1');
        $this->assertSame('none_reachable', $asr['status']);
        $this->assertSame('Early Masjid', $asr['options'][0]['mosque']['name']);
        $this->assertFalse($asr['options'][0]['feasible']);
        $this->assertNotNull($asr['window']['ends_at']);
        $this->assertStringNotContainsString('waypoints', $response->json('maps_url'));
    }

    public function test_identical_requests_are_served_from_the_cache_and_shareable(): void
    {
        $this->mosque('Eliotganj Jame Masjid', 23.5095, 90.8200, '16:30');

        $first = $this->postJson('/api/journeys/plan', $this->payload())->assertCreated()->assertJsonPath('cached', false);
        $this->travelTo(now()->addMinutes(5));
        // Origin 50 m sorano holeo (3 decimal e round) eki cache.
        $second = $this->postJson('/api/journeys/plan', $this->payload(['origin' => ['lat' => 23.7232, 'lng' => 90.4121, 'label' => 'Gulistan']]))
            ->assertOk()
            ->assertJsonPath('cached', true);

        $this->assertSame($first->json('id'), $second->json('id'));
        $this->assertSame(1, $this->routes->routeCalls);

        // Share link: GET /api/journeys/{id}
        $this->getJson('/api/journeys/'.$first->json('id'))
            ->assertOk()
            ->assertJsonPath('prayers.1.prayer', 'asr')
            ->assertJsonPath('request.destination.label', 'Comilla');

        // 15 min pore cache expire, notun Google call.
        $this->travelTo(now()->addMinutes(16));
        $this->postJson('/api/journeys/plan', $this->payload())->assertCreated();
        $this->assertSame(2, $this->routes->routeCalls);
    }

    public function test_validation(): void
    {
        $this->postJson('/api/journeys/plan', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['origin.lat', 'destination.lng']);

        $this->postJson('/api/journeys/plan', $this->payload([
            'depart_at' => now()->subHour()->toIso8601String(),
            'corridor_km' => 9,
            'prayer_duration_min' => 5,
            'facilities' => ['swimming_pool'],
            'mode' => 'rocket',
        ]))->assertJsonValidationErrors(['depart_at', 'corridor_km', 'prayer_duration_min', 'facilities.0', 'mode']);

        $this->postJson('/api/journeys/plan', $this->payload(['mode' => 'walk']))
            ->assertJsonValidationErrors(['mode']);

        $this->postJson('/api/journeys/plan', $this->payload(['destination' => ['lat' => 23.7231, 'lng' => 90.4121]]))
            ->assertJsonValidationErrors(['destination']);

        $this->assertSame(0, $this->routes->routeCalls);
    }

    public function test_guests_are_throttled_to_five_plans_an_hour_and_users_get_more(): void
    {
        for ($i = 0; $i < 5; $i++) {
            // Protibar alada destination, jate cache na lage.
            $this->postJson('/api/journeys/plan', $this->payload(['destination' => ['lat' => 23.46 + $i / 100, 'lng' => 91.18]]))->assertCreated();
        }

        $this->postJson('/api/journeys/plan', $this->payload())
            ->assertTooManyRequests()
            ->assertJsonPath('message', 'You can plan up to 5 journeys an hour. Log in to plan more.');

        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/journeys/plan', $this->payload())->assertCreated();
        $this->assertNotNull(JourneyPlan::query()->whereNotNull('user_id')->first());
    }

    public function test_missing_geoapify_key_returns_a_clear_error(): void
    {
        $this->app->forgetInstance(RoutesClient::class);
        $this->app->offsetUnset(RoutesClient::class);
        $this->app->bind(RoutesClient::class, fn () => new GeoapifyRoutingClient(null));

        $this->postJson('/api/journeys/plan', $this->payload())
            ->assertStatus(503)
            ->assertJsonPath('message', 'The journey planner is not configured yet (GEOAPIFY_API_KEY is missing).');
    }

    public function test_a_routing_connection_failure_returns_a_safe_error_without_saving_a_plan(): void
    {
        Http::fake(['api.geoapify.com/v1/routing*' => Http::failedConnection(
            'cURL error 60: SSL certificate problem for https://api.geoapify.com/v1/routing?apiKey=private-test-api-key',
        )]);
        $this->app->instance(RoutesClient::class, new GeoapifyRoutingClient('private-test-api-key'));

        $response = $this->postJson('/api/journeys/plan', $this->payload())
            ->assertStatus(503)
            ->assertExactJson(['message' => 'Could not reach the routing service. Please try again.']);

        $this->assertStringNotContainsString('private-test-api-key', $response->getContent());
        $this->assertDatabaseCount('journey_plans', 0);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        return array_replace([
            'origin' => ['lat' => 23.7230, 'lng' => 90.4120, 'label' => 'Gulistan'],
            'destination' => ['lat' => 23.4607, 'lng' => 91.1809, 'label' => 'Comilla'],
            'mode' => 'drive',
        ], $overrides);
    }

    private function mosque(string $name, float $lat, float $lng, string $asrJamaat, bool $verified = false): Mosque
    {
        $mosque = Mosque::factory()->create([
            'name' => $name,
            'latitude' => $lat,
            'longitude' => $lng,
            'verification_status' => $verified ? Mosque::VERIFICATION_VERIFIED : Mosque::VERIFICATION_UNVERIFIED,
        ]);

        PrayerTime::factory()->create(['mosque_id' => $mosque->id, 'prayer' => 'asr', 'adhan_time' => '16:05', 'jamaat_time' => $asrJamaat]);

        return $mosque;
    }
}
