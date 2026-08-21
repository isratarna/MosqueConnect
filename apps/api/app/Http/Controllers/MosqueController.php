<?php

namespace App\Http\Controllers;

use App\Models\Mosque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MosqueController extends Controller
{
    private const EARTH_RADIUS_KM = 6371;

    private const DEFAULT_RADIUS_KM = 20;

    private const MAX_RADIUS_KM = 100;

    public function nearby(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'radius' => ['sometimes', 'numeric', 'gt:0', 'lte:'.self::MAX_RADIUS_KM],
        ]);

        $latitude = (float) $validated['latitude'];
        $longitude = (float) $validated['longitude'];
        $radius = (float) ($validated['radius'] ?? self::DEFAULT_RADIUS_KM);

        if (DB::connection()->getDriverName() === 'sqlite') {
            $mosques = Mosque::query()
                ->get()
                ->filter(fn (Mosque $mosque): bool => $this->hasValidCoordinates($mosque))
                ->map(function (Mosque $mosque) use ($latitude, $longitude): array {
                    return $this->mosquePayload(
                        $mosque,
                        $this->distanceInKilometers(
                            $latitude,
                            $longitude,
                            (float) $mosque->latitude,
                            (float) $mosque->longitude,
                        ),
                    );
                })
                ->filter(fn (array $mosque): bool => $mosque['distance_km'] <= $radius)
                ->sort(fn (array $first, array $second): int => [
                    $first['distance_km'],
                    $first['id'],
                ] <=> [
                    $second['distance_km'],
                    $second['id'],
                ])
                ->values();

            return response()->json([
                'data' => $mosques,
            ]);
        }

        $expression = sprintf(
            '%d * ACOS(LEAST(1, GREATEST(-1, COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(latitude)))))',
            self::EARTH_RADIUS_KM,
        );

        $mosques = Mosque::query()
            ->select('mosques.*')
            ->selectRaw($expression.' as distance_km', [$latitude, $longitude, $latitude])
            ->whereBetween('latitude', [-90, 90])
            ->whereBetween('longitude', [-180, 180])
            ->whereRaw($expression.' <= ?', [$latitude, $longitude, $latitude, $radius])
            ->orderBy('distance_km')
            ->orderBy('id')
            ->get()
            ->map(fn (Mosque $mosque): array => $this->mosquePayload($mosque, (float) $mosque->distance_km));

        return response()->json([
            'data' => $mosques,
        ]);
    }

    public function show(Mosque $mosque): JsonResponse
    {
        return response()->json([
            'data' => $this->mosquePayload($mosque),
        ]);
    }

    private function mosquePayload(Mosque $mosque, ?float $distanceKm = null): array
    {
        $payload = [
            'id' => $mosque->id,
            'name' => $mosque->name,
            'address' => $mosque->address,
            'latitude' => (float) $mosque->latitude,
            'longitude' => (float) $mosque->longitude,
            'phone' => $mosque->phone,
            'description' => $mosque->description,
            'verification_status' => $mosque->verification_status,
            'created_at' => $mosque->created_at?->toJSON(),
            'updated_at' => $mosque->updated_at?->toJSON(),
        ];

        if ($distanceKm !== null) {
            $payload['distance_km'] = round($distanceKm, 3);
        }

        return $payload;
    }

    private function distanceInKilometers(float $fromLatitude, float $fromLongitude, float $toLatitude, float $toLongitude): float
    {
        $fromLatitude = deg2rad($fromLatitude);
        $fromLongitude = deg2rad($fromLongitude);
        $toLatitude = deg2rad($toLatitude);
        $toLongitude = deg2rad($toLongitude);

        $latitudeDelta = $toLatitude - $fromLatitude;
        $longitudeDelta = $toLongitude - $fromLongitude;

        $haversine = sin($latitudeDelta / 2) ** 2
            + cos($fromLatitude) * cos($toLatitude) * sin($longitudeDelta / 2) ** 2;

        return 2 * self::EARTH_RADIUS_KM * asin(min(1, sqrt($haversine)));
    }

    private function hasValidCoordinates(Mosque $mosque): bool
    {
        $latitude = filter_var($mosque->latitude, FILTER_VALIDATE_FLOAT);
        $longitude = filter_var($mosque->longitude, FILTER_VALIDATE_FLOAT);

        return $latitude !== false
            && $longitude !== false
            && $latitude >= -90
            && $latitude <= 90
            && $longitude >= -180
            && $longitude <= 180;
    }
}
