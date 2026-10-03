<?php

namespace Tests\Unit\Journey;

use App\Services\Journey\GeoapifyRoutingClient;
use App\Services\Journey\NoRouteException;
use App\Services\Journey\RoutesUnavailableException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeoapifyRoutingClientTest extends TestCase
{
    private const ORIGIN = ['lat' => 23.723, 'lng' => 90.412];

    private const DESTINATION = ['lat' => 23.4607, 'lng' => 91.1809];

    public function test_route_sends_lat_lon_waypoints_and_parses_the_geojson(): void
    {
        Http::fake(['api.geoapify.com/v1/routing*' => Http::response($this->routeResponse())]);

        $route = (new GeoapifyRoutingClient('test-key'))->route(self::ORIGIN, self::DESTINATION, 'drive', true);

        Http::assertSent(function (Request $request): bool {
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

            return $request->method() === 'GET'
                && $query['waypoints'] === '23.723,90.412|23.4607,91.1809'
                && $query['mode'] === 'drive'
                && $query['traffic'] === 'approximated'
                && $query['apiKey'] === 'test-key';
        });

        $this->assertSame(1500.0, $route['distance_m']);
        $this->assertSame(120.0, $route['duration_s']);
        // [lon, lat] theke [lat, lng] e ulte geche.
        $this->assertSame([[23.0, 90.0], [23.0, 90.01], [23.01, 90.01]], $route['points']);
        $this->assertSame([
            ['points' => [[23.0, 90.0], [23.0, 90.01]], 'duration_s' => 50.0],
            ['points' => [[23.0, 90.01], [23.01, 90.01]], 'duration_s' => 70.0],
        ], $route['steps']);
    }

    public function test_walking_routes_never_ask_for_traffic(): void
    {
        Http::fake(['api.geoapify.com/v1/routing*' => Http::response($this->routeResponse())]);

        (new GeoapifyRoutingClient('test-key'))->route(self::ORIGIN, self::DESTINATION, 'walk', true);

        Http::assertSent(fn (Request $request): bool => ! str_contains($request->url(), 'traffic='));
    }

    public function test_matrix_posts_lon_lat_locations_and_returns_durations(): void
    {
        Http::fake(['api.geoapify.com/v1/routematrix*' => Http::response([
            'sources_to_targets' => [
                [['time' => 300, 'distance' => 2000, 'source_index' => 0, 'target_index' => 0], ['time' => null, 'distance' => null, 'source_index' => 0, 'target_index' => 1]],
            ],
        ])]);

        $durations = (new GeoapifyRoutingClient('test-key'))->matrix([self::ORIGIN], [self::DESTINATION, self::ORIGIN], 'drive', false);

        Http::assertSent(fn (Request $request): bool => $request->method() === 'POST'
            && str_contains($request->url(), 'apiKey=test-key')
            && $request['sources'] === [['location' => [90.412, 23.723]]]
            && $request['mode'] === 'drive'
            && ! isset($request['traffic']));

        $this->assertSame([[300.0, null]], $durations);
    }

    public function test_a_bad_request_means_no_route(): void
    {
        Http::fake(['api.geoapify.com/v1/routing*' => Http::response(['statusCode' => 400, 'message' => 'Route not found'], 400)]);

        $this->assertThrows(
            fn () => (new GeoapifyRoutingClient('test-key'))->route(self::ORIGIN, self::DESTINATION, 'drive', false),
            NoRouteException::class,
        );
    }

    public function test_key_and_provider_errors_mean_the_planner_is_unavailable(): void
    {
        Http::fake(['api.geoapify.com/v1/routing*' => Http::response(['statusCode' => 401, 'message' => 'Invalid apiKey'], 401)]);

        $this->assertThrows(
            fn () => (new GeoapifyRoutingClient('bad-key'))->route(self::ORIGIN, self::DESTINATION, 'drive', false),
            RoutesUnavailableException::class,
            'The routing service could not plan this route right now. Please try again.',
        );

        $this->assertThrows(
            fn () => (new GeoapifyRoutingClient(''))->route(self::ORIGIN, self::DESTINATION, 'drive', false),
            RoutesUnavailableException::class,
            'GEOAPIFY_API_KEY is missing',
        );
    }

    /** Geoapify-r moto chhoto GeoJSON: ek leg, duita step, shesh-e destination step. */
    private function routeResponse(): array
    {
        return [
            'type' => 'FeatureCollection',
            'features' => [[
                'type' => 'Feature',
                'properties' => [
                    'distance' => 1500,
                    'time' => 120,
                    'legs' => [['steps' => [
                        ['from_index' => 0, 'to_index' => 1, 'distance' => 1000, 'time' => 50],
                        ['from_index' => 1, 'to_index' => 2, 'distance' => 500, 'time' => 70],
                        ['from_index' => 2, 'to_index' => 2, 'distance' => 0, 'time' => 0],
                    ]]],
                ],
                'geometry' => [
                    'type' => 'MultiLineString',
                    'coordinates' => [[[90.0, 23.0], [90.01, 23.0], [90.01, 23.01]]],
                ],
            ]],
        ];
    }
}
