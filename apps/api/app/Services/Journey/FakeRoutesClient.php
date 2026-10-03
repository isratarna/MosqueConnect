<?php

namespace App\Services\Journey;

use App\Support\Geo;

/**
 * Test-er jonno nokol routing client. Route ta ekta stored Geoapify GeoJSON
 * fixture theke ase (asol parser diye parse hoy), ar matrix time sojasuji
 * durotto × 1.3 ÷ 30 km/h. Koyta call holo gune rakhe, jate test-e cache check kora jay.
 */
class FakeRoutesClient implements RoutesClient
{
    public int $routeCalls = 0;

    public int $matrixCalls = 0;

    /** @var list<array<string, mixed>> */
    public array $requests = [];

    /** @param array<string, mixed> $geojson */
    public function __construct(private readonly array $geojson) {}

    public static function fromFixture(string $name): self
    {
        $path = base_path("tests/Fixtures/routes/{$name}.json");

        return new self(json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR));
    }

    public function route(array $origin, array $destination, string $mode, bool $trafficAware): array
    {
        $this->routeCalls++;
        $this->requests[] = compact('origin', 'destination', 'mode', 'trafficAware');

        return GeoapifyRoutingClient::parseRoute($this->geojson);
    }

    public function matrix(array $sources, array $targets, string $mode, bool $trafficAware): array
    {
        $this->matrixCalls++;

        return array_map(fn (array $source): array => array_map(
            fn (array $target): float => Geo::distanceKm($source['lat'], $source['lng'], $target['lat'], $target['lng']) * 1300 / (30000 / 3600),
            $targets,
        ), $sources);
    }
}
