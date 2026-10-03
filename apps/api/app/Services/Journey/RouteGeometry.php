<?php

namespace App\Services\Journey;

use App\Support\Geo;

/**
 * Route-er upor geometry-r hishab: resample, nearest segment, corridor box.
 * Same maths frontend-er utils/routeGeometry.js e ache (live mode-er jonno).
 *
 * Resampled point-er shape: ['lat', 'lng', 'cum_distance_m', 'eta_s'], jekhane
 * eta_s = departure-er koto second pore oi point-e pouchabo.
 */
class RouteGeometry
{
    public const METRES_PER_DEG_LAT = 110540;

    public const METRES_PER_DEG_LNG = 111320;

    /**
     * Google-er step gula theke route-ke ~$spacing metre por por point-e bhag kori.
     * Step-er time ke $trafficFactor diye gun kori (provider jodi step-e traffic
     * chara time dey tokhon kaje lage; Geoapify-r time e traffic thake, tai 1).
     *
     * @param  list<array{points: list<array{0: float, 1: float}>, duration_s: float}>  $steps
     * @return list<array{lat: float, lng: float, cum_distance_m: float, eta_s: float}>
     */
    public static function resample(array $steps, float $trafficFactor = 1.0, float $spacing = 500): array
    {
        // 1) Shob step-er vertex ek line-e sajai, prottek vertex-e cumulative
        //    distance ar time rakhi. Step-er time oi step-er segment gulo-te
        //    distance-er onupate bhag hoy.
        $vertices = [];
        $distance = 0.0;
        $time = 0.0;

        foreach ($steps as $step) {
            $points = $step['points'];
            if ($points === []) {
                continue;
            }

            $stepLength = 0.0;
            for ($i = 1; $i < count($points); $i++) {
                $stepLength += self::distanceM($points[$i - 1], $points[$i]);
            }

            $stepTime = (float) $step['duration_s'] * $trafficFactor;

            if ($vertices === []) {
                $vertices[] = [$points[0][0], $points[0][1], 0.0, 0.0];
            }

            if ($stepLength <= 0) {
                // Length 0 er step (jemon U-turn): shudhu time ta jog kori.
                $time += $stepTime;
                $vertices[count($vertices) - 1][3] = $time;

                continue;
            }

            for ($i = 1; $i < count($points); $i++) {
                $segment = self::distanceM($points[$i - 1], $points[$i]);
                $distance += $segment;
                $time += $stepTime * $segment / $stepLength;
                $vertices[] = [$points[$i][0], $points[$i][1], $distance, $time];
            }
        }

        if ($vertices === []) {
            return [];
        }

        // 2) Ekhon proti $spacing metre-e interpolate kore notun point nei.
        $resampled = [];
        $target = 0.0;
        $j = 1;
        $last = $vertices[count($vertices) - 1];

        if (count($vertices) === 1) {
            return [['lat' => $last[0], 'lng' => $last[1], 'cum_distance_m' => 0.0, 'eta_s' => $last[3]]];
        }

        while ($target < $last[2]) {
            while ($j < count($vertices) - 1 && $vertices[$j][2] < $target) {
                $j++;
            }

            $resampled[] = self::interpolate($vertices[$j - 1], $vertices[$j], $target);
            $target += $spacing;
        }

        $resampled[] = ['lat' => $last[0], 'lng' => $last[1], 'cum_distance_m' => $last[2], 'eta_s' => $last[3]];

        return $resampled;
    }

    /**
     * Ekta point theke route-er sobcheye kacher segment khuji.
     *
     * @param  list<array{lat: float, lng: float, cum_distance_m: float, eta_s: float}>  $route
     * @return array{off_route_m: float, along_route_m: float, eta_s: float, lat: float, lng: float}
     */
    public static function nearest(array $route, float $lat, float $lng): array
    {
        if (count($route) === 1) {
            $only = $route[0];

            return [
                'off_route_m' => self::distanceM([$lat, $lng], [$only['lat'], $only['lng']]),
                'along_route_m' => $only['cum_distance_m'],
                'eta_s' => $only['eta_s'],
                'lat' => $only['lat'],
                'lng' => $only['lng'],
            ];
        }

        $best = null;

        for ($i = 1; $i < count($route); $i++) {
            $a = $route[$i - 1];
            $b = $route[$i];
            [$distance, $t] = self::pointToSegment([$lat, $lng], [$a['lat'], $a['lng']], [$b['lat'], $b['lng']]);

            if ($best === null || $distance < $best['off_route_m']) {
                $best = [
                    'off_route_m' => $distance,
                    'along_route_m' => $a['cum_distance_m'] + $t * ($b['cum_distance_m'] - $a['cum_distance_m']),
                    'eta_s' => $a['eta_s'] + $t * ($b['eta_s'] - $a['eta_s']),
                    'lat' => $a['lat'] + $t * ($b['lat'] - $a['lat']),
                    'lng' => $a['lng'] + $t * ($b['lng'] - $a['lng']),
                ];
            }
        }

        return $best;
    }

    /**
     * Point P theke segment AB er durotto (metre) ar t (0..1 = AB er kothay porlo).
     * Chhoto segment (<1 km) er jonno local flat metre-e project kori:
     * x = Δlng · cos(lat0) · 111320, y = Δlat · 110540. Bhul matro koyek metre.
     *
     * @param  array{0: float, 1: float}  $p
     * @param  array{0: float, 1: float}  $a
     * @param  array{0: float, 1: float}  $b
     * @return array{0: float, 1: float}
     */
    public static function pointToSegment(array $p, array $a, array $b): array
    {
        $cosLat0 = cos(deg2rad($a[0]));
        $toXY = fn (array $point): array => [
            ($point[1] - $a[1]) * $cosLat0 * self::METRES_PER_DEG_LNG,
            ($point[0] - $a[0]) * self::METRES_PER_DEG_LAT,
        ];

        [$px, $py] = $toXY($p);
        [$bx, $by] = $toXY($b);
        $lengthSquared = $bx * $bx + $by * $by;

        // A ar B ek jaygay hole segment ta asole ekta point.
        $t = $lengthSquared > 0 ? max(0, min(1, ($px * $bx + $py * $by) / $lengthSquared)) : 0;

        return [hypot($px - $t * $bx, $py - $t * $by), $t];
    }

    /**
     * Route-er shuru theke $along metre dure je point, sheta interpolate kore dey.
     *
     * @param  list<array{lat: float, lng: float, cum_distance_m: float, eta_s: float}>  $route
     * @return array{lat: float, lng: float, cum_distance_m: float, eta_s: float}
     */
    public static function pointAt(array $route, float $along): array
    {
        $along = max(0, $along);

        for ($i = 1; $i < count($route); $i++) {
            if ($route[$i]['cum_distance_m'] >= $along) {
                $a = $route[$i - 1];
                $b = $route[$i];

                return self::interpolate(
                    [$a['lat'], $a['lng'], $a['cum_distance_m'], $a['eta_s']],
                    [$b['lat'], $b['lng'], $b['cum_distance_m'], $b['eta_s']],
                    $along,
                );
            }
        }

        return $route[count($route) - 1];
    }

    /**
     * Ekta nirdishto somoy (eta_s) e route-er kon point-e thakbo.
     *
     * @param  list<array{lat: float, lng: float, cum_distance_m: float, eta_s: float}>  $route
     * @return array{lat: float, lng: float, cum_distance_m: float, eta_s: float}
     */
    public static function pointAtTime(array $route, float $etaS): array
    {
        if ($etaS <= $route[0]['eta_s']) {
            return $route[0];
        }

        for ($i = 1; $i < count($route); $i++) {
            if ($route[$i]['eta_s'] >= $etaS) {
                $a = $route[$i - 1];
                $b = $route[$i];
                $span = $b['eta_s'] - $a['eta_s'];
                $t = $span > 0 ? ($etaS - $a['eta_s']) / $span : 0;

                return [
                    'lat' => $a['lat'] + $t * ($b['lat'] - $a['lat']),
                    'lng' => $a['lng'] + $t * ($b['lng'] - $a['lng']),
                    'cum_distance_m' => $a['cum_distance_m'] + $t * ($b['cum_distance_m'] - $a['cum_distance_m']),
                    'eta_s' => $etaS,
                ];
            }
        }

        return $route[count($route) - 1];
    }

    /**
     * Route ke ~$windowM metre-er window-e bhag kore prottek window-er bounding
     * box ke $paddingKm km chhoriye dey. Ei box diye corridor-er mosque query hoy.
     *
     * @param  list<array{lat: float, lng: float, cum_distance_m: float, eta_s: float}>  $route
     * @return list<array{south: float, west: float, north: float, east: float}>
     */
    public static function corridorBoxes(array $route, float $paddingKm, float $windowM = 10000): array
    {
        $boxes = [];
        $current = null;
        $windowStart = 0.0;
        $last = count($route) - 1;

        foreach ($route as $index => $point) {
            $current ??= ['south' => $point['lat'], 'north' => $point['lat'], 'west' => $point['lng'], 'east' => $point['lng']];
            $current['south'] = min($current['south'], $point['lat']);
            $current['north'] = max($current['north'], $point['lat']);
            $current['west'] = min($current['west'], $point['lng']);
            $current['east'] = max($current['east'], $point['lng']);

            if ($index === $last || $windowM <= $point['cum_distance_m'] - $windowStart) {
                $boxes[] = self::pad($current, $paddingKm);
                // Porer window ei point theke shuru, jate majhe kono fak na thake.
                $current = ['south' => $point['lat'], 'north' => $point['lat'], 'west' => $point['lng'], 'east' => $point['lng']];
                $windowStart = $point['cum_distance_m'];
            }
        }

        return $boxes;
    }

    /**
     * @param  array{0: float, 1: float}  $from
     * @param  array{0: float, 1: float}  $to
     */
    public static function distanceM(array $from, array $to): float
    {
        return Geo::distanceKm($from[0], $from[1], $to[0], $to[1]) * 1000;
    }

    /**
     * @param  array{south: float, west: float, north: float, east: float}  $box
     * @return array{south: float, west: float, north: float, east: float}
     */
    private static function pad(array $box, float $km): array
    {
        $latPad = $km * 1000 / self::METRES_PER_DEG_LAT;
        $midLat = deg2rad(($box['south'] + $box['north']) / 2);
        $lngPad = $km * 1000 / (self::METRES_PER_DEG_LNG * max(0.01, cos($midLat)));

        return [
            'south' => $box['south'] - $latPad,
            'north' => $box['north'] + $latPad,
            'west' => $box['west'] - $lngPad,
            'east' => $box['east'] + $lngPad,
        ];
    }

    /**
     * Duita vertex [lat, lng, cum_m, eta_s] er majhe $distance metre-e interpolate.
     *
     * @param  array{0: float, 1: float, 2: float, 3: float}  $a
     * @param  array{0: float, 1: float, 2: float, 3: float}  $b
     * @return array{lat: float, lng: float, cum_distance_m: float, eta_s: float}
     */
    private static function interpolate(array $a, array $b, float $distance): array
    {
        $span = $b[2] - $a[2];
        $t = $span > 0 ? max(0, min(1, ($distance - $a[2]) / $span)) : 0;

        return [
            'lat' => $a[0] + $t * ($b[0] - $a[0]),
            'lng' => $a[1] + $t * ($b[1] - $a[1]),
            'cum_distance_m' => $a[2] + $t * $span,
            'eta_s' => $a[3] + $t * ($b[3] - $a[3]),
        ];
    }
}
