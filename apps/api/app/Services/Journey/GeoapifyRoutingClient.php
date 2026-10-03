<?php

namespace App\Services\Journey;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Geoapify Routing API (route) ar Route Matrix API (detour time).
 * https://apidocs.geoapify.com/docs/routing/
 * https://apidocs.geoapify.com/docs/route-matrix/
 *
 * Geoapify GeoJSON e coordinate [lon, lat] order-e dey; ekhane [lat, lng] e
 * ulte dei, jate baki code (RouteGeometry, Polyline) eki thake.
 */
class GeoapifyRoutingClient implements RoutesClient
{
    private const ROUTING_URL = 'https://api.geoapify.com/v1/routing';

    private const MATRIX_URL = 'https://api.geoapify.com/v1/routematrix';

    public function __construct(private readonly ?string $key, private readonly int $timeout = 15) {}

    public function route(array $origin, array $destination, string $mode, bool $trafficAware): array
    {
        $response = $this->send(fn () => Http::timeout($this->timeout)
            ->acceptJson()
            ->get(self::ROUTING_URL, array_filter([
                // Geoapify waypoint "lat,lon" order-e, "|" diye alada.
                'waypoints' => "{$origin['lat']},{$origin['lng']}|{$destination['lat']},{$destination['lng']}",
                'mode' => $mode,
                // "approximated" = bhir-er rastay speed komiye dhore; shudhu gari-te kaj kore.
                'traffic' => $this->traffic($mode, $trafficAware),
                'apiKey' => $this->key,
            ])));

        // 400 mane sadharonoto duita jaygar moddhe rasta nei (input age-i validate kora).
        if ($response->status() === 400) {
            throw new NoRouteException('No route was found between these places.');
        }

        $this->ensureOk($response);

        return self::parseRoute($response->json() ?? []);
    }

    public function matrix(array $sources, array $targets, string $mode, bool $trafficAware): array
    {
        $location = fn (array $point): array => ['location' => [$point['lng'], $point['lat']]];

        $response = $this->send(fn () => Http::timeout($this->timeout)
            ->acceptJson()
            ->withQueryParameters(['apiKey' => $this->key])
            ->post(self::MATRIX_URL, array_filter([
                'mode' => $mode,
                'sources' => array_map($location, $sources),
                'targets' => array_map($location, $targets),
                'traffic' => $this->traffic($mode, $trafficAware),
            ])));

        $this->ensureOk($response);

        // sources_to_targets[i][j] = { time, distance, ... }; rasta na thakle time null.
        return array_map(
            fn (array $row): array => array_map(fn (?array $cell): ?float => isset($cell['time']) ? (float) $cell['time'] : null, $row),
            $response->json('sources_to_targets') ?? [],
        );
    }

    /**
     * Geoapify GeoJSON route ke normalized shape e ana. Geometry MultiLineString
     * (prottek leg-er jonno ekta line); step-er from_index..to_index oi line-er
     * kon ongsho sheta bole. Test-er FakeRoutesClient-o eta use kore.
     *
     * @param  array<string, mixed>  $geojson
     * @return array{distance_m: float, duration_s: float, points: list<array{0: float, 1: float}>, steps: list<array{points: list<array{0: float, 1: float}>, duration_s: float}>}
     */
    public static function parseRoute(array $geojson): array
    {
        $feature = $geojson['features'][0] ?? null;
        $geometry = $feature['geometry'] ?? [];
        $lines = match ($geometry['type'] ?? null) {
            'MultiLineString' => $geometry['coordinates'],
            'LineString' => [$geometry['coordinates']],
            default => [],
        };

        if (! $feature || $lines === []) {
            throw new NoRouteException('No route was found between these places.');
        }

        $toLatLng = fn (array $lonLat): array => [(float) $lonLat[1], (float) $lonLat[0]];
        $points = [];
        $steps = [];

        foreach ($lines as $legIndex => $line) {
            $line = array_map($toLatLng, $line);
            // Porer leg-er prothom point ager leg-er shesh point, tai bad dei.
            array_push($points, ...($points === [] ? $line : array_slice($line, 1)));

            foreach ($feature['properties']['legs'][$legIndex]['steps'] ?? [] as $step) {
                $from = (int) $step['from_index'];
                $to = (int) $step['to_index'];

                // from == to hole step ta shudhu destination point, kono rasta nei.
                if ($to <= $from) {
                    continue;
                }

                $steps[] = [
                    'points' => array_slice($line, $from, $to - $from + 1),
                    'duration_s' => (float) ($step['time'] ?? 0),
                ];
            }
        }

        // Step na thakle puro line ta ek step, puro time shoho.
        if ($steps === []) {
            $steps[] = ['points' => $points, 'duration_s' => (float) ($feature['properties']['time'] ?? 0)];
        }

        return [
            'distance_m' => (float) ($feature['properties']['distance'] ?? 0),
            'duration_s' => (float) ($feature['properties']['time'] ?? 0),
            'points' => $points,
            'steps' => $steps,
        ];
    }

    private function traffic(string $mode, bool $trafficAware): ?string
    {
        return $mode === 'drive' && $trafficAware ? 'approximated' : null;
    }

    /** @param callable(): Response $request */
    private function send(callable $request): Response
    {
        if (blank($this->key)) {
            throw new RoutesUnavailableException('The journey planner is not configured yet (GEOAPIFY_API_KEY is missing).');
        }

        try {
            return $request();
        } catch (ConnectionException) {
            throw new RoutesUnavailableException('Could not reach the routing service. Please try again.');
        }
    }

    private function ensureOk(Response $response): void
    {
        if ($response->successful()) {
            return;
        }

        // Asol karon log-e jay (key bhul, credit shesh), user ke shadharon message.
        report(new RoutesUnavailableException("Geoapify {$response->status()}: ".$response->json('message', '')));

        throw new RoutesUnavailableException('The routing service could not plan this route right now. Please try again.');
    }
}
