<?php

namespace App\Services\Journey;

use App\Models\Mosque;
use App\Services\PrayerScheduleService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Journey planner: route ana -> route-er pashe mosque khoja (corridor) ->
 * trip-er moddhe kon namaz pore -> prottek namaz-er jonno mosque gula score
 * kora -> top gula real driving time diye refine kora -> Google Maps link.
 * Routing (route + matrix) RoutesClient diye hoy (production-e Geoapify).
 *
 * Shudhu time ar option dekhai; kono fiqh-er ruling (qasr / jam') dei na.
 */
class JourneyPlannerService
{
    /** Routing API call count, log ar journey_plans e rakhar jonno. */
    private array $calls = ['routes' => 0, 'matrix' => 0, 'matrix_elements' => 0];

    /** Ei plan-e traffic dhora hobe kina; matrix call-eo eki setting. */
    private bool $trafficAware = false;

    public function __construct(
        private readonly RoutesClient $routes,
        private readonly PrayerWindowResolver $windows,
        private readonly ReachabilityService $reachability,
    ) {}

    /**
     * @param  array{origin: array{lat: float, lng: float, label?: string|null}, destination: array{lat: float, lng: float, label?: string|null}, depart_at: CarbonImmutable, mode: string, corridor_km: float, facilities: list<string>, prayer_duration_min: int}  $input
     * @return array{plan: array<string, mixed>, routing_calls: array<string, int>}
     */
    public function plan(array $input): array
    {
        $this->calls = ['routes' => 0, 'matrix' => 0, 'matrix_elements' => 0];
        $departAt = $input['depart_at'];
        $mode = $this->providerMode($input['mode']);

        // 1) Route ana. Ekhon theke 3 ghontar moddhe rowna hole traffic dhori
        //    (porer somoy-er traffic ager theke jana jay na).
        $this->trafficAware = $input['mode'] === 'drive'
            && $departAt->lessThanOrEqualTo(CarbonImmutable::now()->addHours((int) config('journey.plan.traffic_aware_hours', 3)));
        $this->calls['routes']++;
        $route = $this->routes->route($input['origin'], $input['destination'], $mode, $this->trafficAware);

        // 2) Route ke 500 m por por point-e bhag kore prottek point-er ETA.
        //    Step-er time e traffic age thekei dhora, tai factor 1.
        $points = RouteGeometry::resample($route['steps'], 1.0, (float) config('journey.plan.resample_m', 500));
        if ($points === []) {
            throw new NoRouteException('No route was found between these places.');
        }

        $durationS = (int) round($route['duration_s']);
        $arriveAt = $departAt->addSeconds((int) round(end($points)['eta_s'] ?: $durationS));

        // 3) Route-er corridor-e mosque khoja ar trip-er namaz gula ber kora.
        $candidates = $this->corridorCandidates($points, (float) $input['corridor_km']);
        $prayers = [];

        foreach ($this->windows->resolve($points, $departAt, $arriveAt) as $window) {
            $prayers[] = $this->planPrayer($window, $candidates, $points, $input, $departAt, $arriveAt);
        }

        return [
            'plan' => [
                'route' => [
                    // Frontend map (google.maps.geometry.encoding.decodePath) eta decode kore.
                    'encoded_polyline' => Polyline::encode($route['points']),
                    'distance_m' => (int) round($route['distance_m'] ?: end($points)['cum_distance_m']),
                    'duration_s' => $durationS,
                    'depart_at' => $departAt->toIso8601String(),
                    'arrive_at' => $arriveAt->toIso8601String(),
                    // Live mode browser-e ei point gulo-te project kore progress
                    // ber kore: [lat, lng, cum_distance_m, eta_s].
                    'points' => array_map(fn (array $p): array => [
                        round($p['lat'], 5),
                        round($p['lng'], 5),
                        (int) round($p['cum_distance_m']),
                        (int) round($p['eta_s']),
                    ], $points),
                ],
                'origin' => $input['origin'],
                'destination' => $input['destination'],
                'mode' => $input['mode'],
                'prayers' => $prayers,
                'maps_url' => $this->mapsUrl($input, $prayers),
            ],
            'routing_calls' => $this->calls,
        ];
    }

    /**
     * Prottek namaz-er jonno corridor-er mosque gula score kore rank kori.
     *
     * @param  Collection<int, array{mosque: Mosque, nearest: array}>  $candidates
     * @return array<string, mixed>
     */
    private function planPrayer(array $window, Collection $candidates, array $points, array $input, CarbonImmutable $departAt, CarbonImmutable $arriveAt): array
    {
        $scored = [];

        foreach ($candidates as $candidate) {
            $jamaat = collect($this->reachability->jamaatsOn($candidate['mosque'], $window['starts_at']))
                ->firstWhere('prayer', $window['prayer']);

            // Ei window-er baire je jamaat (jemon ager din-er) sheta bad.
            if (! $jamaat || $jamaat['jamaat_at']->lessThan($window['starts_at']->subMinutes(5)) || $jamaat['jamaat_at']->greaterThanOrEqualTo($window['ends_at'])) {
                continue;
            }

            $scored[] = $this->score($candidate, $jamaat, $input, $departAt);
        }

        $maxWait = (int) config('journey.plan.max_wait_min', 60);
        $feasible = array_values(array_filter($scored, fn (array $o): bool => $o['feasible'] && $o['wait_min'] <= $maxWait));
        $feasible = $this->rank($feasible, $input['facilities']);

        // Top 3 ke Route Matrix diye asol detour time e refine kori, tarpor abar rank.
        if ($feasible !== [] && $input['mode'] === 'drive') {
            $top = array_slice($feasible, 0, (int) config('journey.plan.refine_top', 3));
            $refined = $this->refine($top, $points, $input, $departAt);
            $feasible = $this->rank(array_merge($refined, array_slice($feasible, count($top))), $input['facilities']);
            $feasible = array_values(array_filter($feasible, fn (array $o): bool => $o['feasible']));
        }

        $status = $feasible !== [] ? 'ok' : 'none_reachable';
        $options = $feasible !== [] ? $feasible : $this->nearestAnyway($scored, $window);

        return [
            'prayer' => $window['prayer'],
            'label' => $window['label'],
            'window' => [
                'starts_at' => $window['starts_at']->toIso8601String(),
                'ends_at' => $window['ends_at']->toIso8601String(),
                'near_label' => $this->nearLabel($window, $candidates, $input, $departAt, $arriveAt),
            ],
            'status' => $status,
            'options' => array_map(fn (array $o): array => $this->present($o), array_slice($options, 0, (int) config('journey.plan.options_per_prayer', 3))),
        ];
    }

    /**
     * Estimate: approach = off_route × 1.3 ÷ local speed + parking.
     * delay = 2 × approach + wait + namaz-er somoy (destination e koto deri hobe).
     */
    private function score(array $candidate, array $jamaat, array $input, CarbonImmutable $departAt): array
    {
        $nearest = $candidate['nearest'];
        $speedMpm = (float) config("journey.speeds_kmh.{$input['mode']}") * 1000 / 60;
        $parking = $input['mode'] === 'drive' ? (int) config('journey.parking_min', 3) : 0;
        $approachMin = $nearest['off_route_m'] * (float) config('journey.road_factor', 1.3) / $speedMpm + $parking;

        return $this->timing($candidate, $jamaat, $input, $departAt, $approachMin, $approachMin, false);
    }

    /**
     * to_min = exit point theke mosque, back_min = mosque theke route-e phire jawar
     * extra somoy. Duita mile detour; tar sathe wait ar namaz jog kore delay.
     */
    private function timing(array $candidate, array $jamaat, array $input, CarbonImmutable $departAt, float $toMin, float $backMin, bool $refined): array
    {
        $exitAt = $departAt->addSeconds((int) round($candidate['nearest']['eta_s']));
        $arriveAt = $exitAt->addSeconds((int) round($toMin * 60));
        $waitMin = ($jamaat['jamaat_at']->getTimestamp() - $arriveAt->getTimestamp()) / 60;
        $detourMin = $toMin + $backMin;

        return [
            'candidate' => $candidate,
            'jamaat' => $jamaat,
            'exit_at' => $exitAt,
            'arrive_at' => $arriveAt,
            'to_min' => $toMin,
            'wait_min' => (int) floor($waitMin),
            'detour_min' => $detourMin,
            'delay_min' => $detourMin + max(0, $waitMin) + (int) $input['prayer_duration_min'],
            'feasible' => ReachabilityService::isFeasible($arriveAt, $jamaat['jamaat_at']),
            'refined' => $refined,
            'facility_matches' => count(array_intersect($input['facilities'], $candidate['summary']['facilities'])),
        ];
    }

    /**
     * Rank: kom delay age, tarpor verified, tarpor chawa facility kotogula ache, tarpor rating.
     */
    private function rank(array $options, array $facilities): array
    {
        usort($options, fn (array $a, array $b): int => [
            round($a['delay_min'], 1),
            ! $a['candidate']['summary']['verified'],
            -$a['facility_matches'],
            -($a['candidate']['summary']['rating'] ?? 0),
        ] <=> [
            round($b['delay_min'], 1),
            ! $b['candidate']['summary']['verified'],
            -$b['facility_matches'],
            -($b['candidate']['summary']['rating'] ?? 0),
        ]);

        return $options;
    }

    /**
     * Top candidate gular jonno matrix diye asol driving time: exit -> mosque
     * ar mosque -> rejoin (1 km samne). Duita chhoto n×n matrix, karon shudhu
     * diagonal (eki candidate) lage; ekta 2n×2n er cheye credit kom khoroch hoy.
     */
    private function refine(array $options, array $points, array $input, CarbonImmutable $departAt): array
    {
        $chunkSize = max(1, (int) floor(sqrt((int) config('journey.plan.matrix_max_elements', 1000))));
        $mode = $this->providerMode($input['mode']);
        $refined = [];

        foreach (array_chunk($options, $chunkSize) as $chunk) {
            $n = count($chunk);
            $exits = [];
            $mosques = [];
            $rejoins = [];

            foreach ($chunk as $option) {
                $nearest = $option['candidate']['nearest'];
                $rejoins[] = RouteGeometry::pointAt($points, $nearest['along_route_m'] + (float) config('journey.plan.rejoin_m', 1000));
                $exits[] = ['lat' => $nearest['lat'], 'lng' => $nearest['lng']];
                $mosques[] = ['lat' => $option['candidate']['summary']['lat'], 'lng' => $option['candidate']['summary']['lng']];
            }

            $this->calls['matrix'] += 2;
            $this->calls['matrix_elements'] += 2 * $n * $n;

            try {
                $toMosque = $this->routes->matrix($exits, $mosques, $mode, $this->trafficAware);
                $backToRoute = $this->routes->matrix(
                    $mosques,
                    array_map(fn (array $p): array => ['lat' => $p['lat'], 'lng' => $p['lng']], $rejoins),
                    $mode,
                    $this->trafficAware,
                );
            } catch (RoutesUnavailableException) {
                // Matrix fail korle estimate tai rakhi; plan ta bondho kori na.
                array_push($refined, ...$chunk);

                continue;
            }

            foreach ($chunk as $i => $option) {
                $to = $toMosque[$i][$i] ?? null;
                $back = $backToRoute[$i][$i] ?? null;

                // Rasta na pele (null) estimate tai thake.
                if ($to === null || $back === null) {
                    $refined[] = $option;

                    continue;
                }

                $parking = (int) config('journey.parking_min', 3);
                $routeMin = ($rejoins[$i]['eta_s'] - $option['candidate']['nearest']['eta_s']) / 60;
                $refined[] = $this->timing($option['candidate'], $option['jamaat'], $input, $departAt, $to / 60 + $parking, max(0, $back / 60 - $routeMin), true);
            }
        }

        return $refined;
    }

    /**
     * Kono mosque dhora na gele-o kacher mosque gula dekhai (feasible = false),
     * age jegulo window-er somoy route-er pashe pore.
     */
    private function nearestAnyway(array $scored, array $window): array
    {
        usort($scored, function (array $a, array $b) use ($window): int {
            $inWindow = fn (array $o): bool => $o['exit_at']->betweenIncluded($window['starts_at'], $window['ends_at']);

            return [! $inWindow($a), $a['candidate']['nearest']['off_route_m']] <=> [! $inWindow($b), $b['candidate']['nearest']['off_route_m']];
        });

        return $scored;
    }

    /** "near Feni" er moto label: window shuru-r jaygar kacher mosque-er area. */
    private function nearLabel(array $window, Collection $candidates, array $input, CarbonImmutable $departAt, CarbonImmutable $arriveAt): ?string
    {
        if ($window['starts_at']->lessThanOrEqualTo($departAt)) {
            return $input['origin']['label'] ?? null;
        }

        if ($window['starts_at']->greaterThanOrEqualTo($arriveAt)) {
            return $input['destination']['label'] ?? null;
        }

        $closest = $candidates
            ->sortBy(fn (array $c): float => RouteGeometry::distanceM([$window['lat'], $window['lng']], [$c['summary']['lat'], $c['summary']['lng']]))
            ->first();

        return $closest ? ($closest['summary']['area'] ?? $closest['summary']['district']) : null;
    }

    /** API response-er option shape. */
    private function present(array $option): array
    {
        $tz = config('prayer.timezone');

        return [
            'mosque' => $option['candidate']['summary'],
            'label' => $option['jamaat']['label'],
            'jamaat_at' => $option['jamaat']['jamaat_at']->setTimezone($tz)->toIso8601String(),
            'pass_at' => $option['exit_at']->setTimezone($tz)->toIso8601String(),
            'arrive_at' => $option['arrive_at']->setTimezone($tz)->toIso8601String(),
            'wait_min' => $option['wait_min'],
            'detour_min' => (int) round($option['detour_min']),
            'delay_min' => (int) round($option['delay_min']),
            'off_route_m' => (int) round($option['candidate']['nearest']['off_route_m']),
            'along_route_m' => (int) round($option['candidate']['nearest']['along_route_m']),
            'feasible' => $option['feasible'],
            'refined' => $option['refined'],
            'source' => $option['jamaat']['source'],
            'estimated' => $option['jamaat']['source'] === PrayerScheduleService::SOURCE_CALCULATED,
        ];
    }

    /**
     * Google Maps directions link, prottek ok namaz-er best stop waypoint hishebe.
     */
    private function mapsUrl(array $input, array $prayers): string
    {
        $waypoints = collect($prayers)
            ->filter(fn (array $p): bool => $p['status'] === 'ok')
            ->map(fn (array $p): array => $p['options'][0])
            ->sortBy('along_route_m')
            ->unique(fn (array $o) => $o['mosque']['id'])
            ->take((int) config('journey.plan.max_waypoints', 4))
            ->map(fn (array $o): string => $o['mosque']['lat'].','.$o['mosque']['lng'])
            ->values()
            ->all();

        $query = [
            'api' => 1,
            'origin' => $input['origin']['lat'].','.$input['origin']['lng'],
            'destination' => $input['destination']['lat'].','.$input['destination']['lng'],
            'travelmode' => $input['mode'] === 'walk' ? 'walking' : 'driving',
        ];

        if ($waypoints !== []) {
            $query['waypoints'] = implode('|', $waypoints);
        }

        return 'https://www.google.com/maps/dir/?'.http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * Prottek ~10 km window-er bounding box (corridor_km chhoriye) diye
     * latitude/longitude index-e query, duplicate bad, tarpor nearest segment.
     *
     * @return Collection<int, array{mosque: Mosque, summary: array, nearest: array}>
     */
    private function corridorCandidates(array $points, float $corridorKm): Collection
    {
        $boxes = RouteGeometry::corridorBoxes($points, $corridorKm, (float) config('journey.plan.window_km', 10) * 1000);
        $mosques = collect();

        foreach ($boxes as $box) {
            $found = Mosque::query()
                ->with(['facilities', 'prayerTimes', 'jumuahSessions'])
                ->whereBetween('latitude', [$box['south'], $box['north']])
                ->whereBetween('longitude', [$box['west'], $box['east']])
                ->get();

            foreach ($found as $mosque) {
                $mosques->put($mosque->id, $mosque);
            }
        }

        return $mosques
            ->map(fn (Mosque $mosque): array => [
                'mosque' => $mosque,
                'summary' => ReachabilityService::mosqueSummary($mosque),
                'nearest' => RouteGeometry::nearest($points, (float) $mosque->latitude, (float) $mosque->longitude),
            ])
            ->filter(fn (array $c): bool => $c['nearest']['off_route_m'] <= $corridorKm * 1000)
            ->values();
    }

    /** Amader mode (drive / walk) theke provider-er mode naam. */
    private function providerMode(string $mode): string
    {
        return config("journey.plan.modes.{$mode}", 'drive');
    }
}
