<?php

namespace Tests\Unit\Journey;

use App\Services\Journey\Polyline;
use App\Services\Journey\RouteGeometry;
use PHPUnit\Framework\TestCase;

class RouteGeometryTest extends TestCase
{
    public function test_it_decodes_googles_documented_sample_polyline(): void
    {
        $points = Polyline::decode('_p~iF~ps|U_ulLnnqC_mqNvxq`@');

        $this->assertSame([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]], $points);
    }

    public function test_encode_round_trips_with_decode(): void
    {
        $points = [[23.7230, 90.4120], [23.7104, 90.4348], [23.4607, 91.1809]];

        $this->assertSame($points, Polyline::decode(Polyline::encode($points)));
        $this->assertSame('_p~iF~ps|U_ulLnnqC_mqNvxq`@', Polyline::encode([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]));
    }

    public function test_resampling_spaces_points_and_spreads_step_time_by_distance(): void
    {
        // Duita step, prottek ta purbe ~1.02 km (0.01° lng at the equator ≈ 1113 m).
        $steps = [
            ['points' => [[0.0, 0.0], [0.0, 0.01]], 'duration_s' => 100],
            ['points' => [[0.0, 0.01], [0.0, 0.02]], 'duration_s' => 300],
        ];

        $points = RouteGeometry::resample($steps, 1.5, 500);
        $last = end($points);

        $this->assertEqualsWithDelta(2224, $last['cum_distance_m'], 5);
        // Traffic factor 1.5: (100 + 300) × 1.5 = 600 s.
        $this->assertEqualsWithDelta(600, $last['eta_s'], 0.01);

        // Prottek point ~500 m por por.
        $this->assertEqualsWithDelta(500, $points[1]['cum_distance_m'], 0.01);
        $this->assertEqualsWithDelta(1000, $points[2]['cum_distance_m'], 0.01);

        // Prothom step-e 1112 m-e 150 s: tai 500 m = 67.4 s.
        $this->assertEqualsWithDelta(150 * 500 / 1112, $points[1]['eta_s'], 0.5);

        // Ditiyo step-e speed kom (450 s / 1112 m), 1500 m = 150 + 388 m × 450/1112.
        $this->assertEqualsWithDelta(150 + (1500 - 1112) * 450 / 1112, $points[3]['eta_s'], 0.5);
    }

    public function test_point_to_segment_distance(): void
    {
        $a = [23.7, 90.4];
        $b = [23.7, 90.41];

        // Segment-er majhkhane, uttore 0.001° lat = 110.54 m.
        [$distance, $t] = RouteGeometry::pointToSegment([23.701, 90.405], $a, $b);
        $this->assertEqualsWithDelta(110.54, $distance, 0.5);
        $this->assertEqualsWithDelta(0.5, $t, 0.01);

        // Segment-er shesh-er baire: B porjonto durotto.
        [$distance, $t] = RouteGeometry::pointToSegment([23.7, 90.42], $a, $b);
        $this->assertEqualsWithDelta(0.01 * cos(deg2rad(23.7)) * 111320, $distance, 1);
        $this->assertSame(1.0, (float) $t);
    }

    public function test_nearest_returns_off_route_distance_and_eta_at_exit(): void
    {
        $route = RouteGeometry::resample([['points' => [[0.0, 0.0], [0.0, 0.02]], 'duration_s' => 200]], 1.0, 500);

        $nearest = RouteGeometry::nearest($route, 0.002, 0.01);

        $this->assertEqualsWithDelta(221, $nearest['off_route_m'], 2);
        $this->assertEqualsWithDelta(1113, $nearest['along_route_m'], 3);
        $this->assertEqualsWithDelta(100, $nearest['eta_s'], 0.5);
    }

    public function test_corridor_boxes_cover_the_route_with_padding(): void
    {
        $route = RouteGeometry::resample([['points' => [[0.0, 0.0], [0.0, 0.3]], 'duration_s' => 2000]], 1.0, 500);

        $boxes = RouteGeometry::corridorBoxes($route, 2, 10000);

        // ~33 km route, 10 km window: 4 ta box.
        $this->assertCount(4, $boxes);
        $this->assertEqualsWithDelta(-2000 / 110540, $boxes[0]['south'], 1e-6);
        $this->assertLessThanOrEqual(0.0, $boxes[0]['west']);
        $this->assertGreaterThanOrEqual(0.3, end($boxes)['east']);
    }
}
