<?php

namespace App\Services\Journey;

/**
 * Routing provider-er shathe kotha bolar contract. Asol call GeoapifyRoutingClient
 * kore, test-e FakeRoutesClient use hoy jate kono network call na hoy.
 *
 * Provider jai hok, duita method-i normalized shape ferot dey, tai planner-er
 * logic provider bodlale bodlay na. Shob coordinate [lat, lng] order-e.
 */
interface RoutesClient
{
    /**
     * Route: puro geometry, mot distance/time, ar step onujayi geometry + time.
     * $trafficAware hole provider traffic dhore time dey (jodi pare).
     *
     * @param  array{lat: float, lng: float}  $origin
     * @param  array{lat: float, lng: float}  $destination
     * @return array{distance_m: float, duration_s: float, points: list<array{0: float, 1: float}>, steps: list<array{points: list<array{0: float, 1: float}>, duration_s: float}>}
     *
     * @throws NoRouteException jokhon duita jaygar moddhe rasta nei
     * @throws RoutesUnavailableException jokhon key nei ba provider error dey
     */
    public function route(array $origin, array $destination, string $mode, bool $trafficAware): array;

    /**
     * Matrix: $durations[$i][$j] = source $i theke target $j jete koto second
     * (rasta na thakle null).
     *
     * @param  list<array{lat: float, lng: float}>  $sources
     * @param  list<array{lat: float, lng: float}>  $targets
     * @return list<list<float|null>>
     *
     * @throws RoutesUnavailableException
     */
    public function matrix(array $sources, array $targets, string $mode, bool $trafficAware): array;
}
