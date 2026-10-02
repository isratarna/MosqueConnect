<?php

namespace App\Http\Controllers;

use App\Http\Resources\MosqueResource;
use App\Models\Mosque;
use App\Services\PrayerScheduleService;
use App\Support\EidSeason;
use App\Support\Geo;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MosqueController extends Controller
{
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
                ->with($this->summaryRelations())
                ->get()
                ->filter(fn (Mosque $mosque): bool => $this->hasValidCoordinates($mosque))
                ->map(function (Mosque $mosque) use ($latitude, $longitude): array {
                    return (new MosqueResource(
                        $mosque,
                        false,
                        Geo::distanceKm(
                            $latitude,
                            $longitude,
                            (float) $mosque->latitude,
                            (float) $mosque->longitude,
                        ),
                    ))->resolve();
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
            Geo::EARTH_RADIUS_KM,
        );

        $mosques = Mosque::query()
            ->with($this->summaryRelations())
            ->select('mosques.*')
            ->selectRaw($expression.' as distance_km', [$latitude, $longitude, $latitude])
            ->whereBetween('latitude', [-90, 90])
            ->whereBetween('longitude', [-180, 180])
            ->whereRaw($expression.' <= ?', [$latitude, $longitude, $latitude, $radius])
            ->orderBy('distance_km')
            ->orderBy('id')
            ->get()
            ->map(fn (Mosque $mosque): array => (new MosqueResource($mosque, false, (float) $mosque->distance_km))->resolve());

        return response()->json([
            'data' => $mosques,
        ]);
    }

    public function show(Mosque $mosque): JsonResponse
    {
        $mosque->load([
            ...$this->summaryRelations(),
            'jumuahSessions',
            'publishedAnnouncements',
        ]);

        // Eid jamaats are only part of the profile while the Eid season shows.
        if ($season = EidSeason::active()) {
            $mosque->load(['eidJamaats' => fn ($query) => $query
                ->published()
                ->forSeason($season['eid'], $season['year'])]);
        }

        return response()->json([
            'data' => (new MosqueResource($mosque, true))->resolve(),
        ]);
    }

    public function prayerSchedule(Mosque $mosque, PrayerScheduleService $schedules): JsonResponse
    {
        $mosque->load(['prayerTimes', 'jumuahSessions']);
        $date = CarbonImmutable::now(config('prayer.timezone'));

        return response()->json([
            'data' => [
                'mosque_id' => $mosque->id,
                'date' => $date->toDateString(),
                'prayer_schedule' => $schedules->forDate($mosque, $date),
                'jumuah_sessions' => $mosque->jumuahSessions
                    ->map(fn ($session): array => [
                        'id' => $session->id,
                        'sequence' => $session->sequence,
                        'label' => $session->label,
                        'khutbah_time' => $session->khutbah_time ? substr($session->khutbah_time, 0, 5) : null,
                        'jamaat_time' => $session->jamaat_time ? substr($session->jamaat_time, 0, 5) : null,
                        'notes' => $session->notes,
                    ])
                    ->values()
                    ->all(),
            ],
        ]);
    }

    /**
     * @return list<string>
     */
    private function summaryRelations(): array
    {
        return ['facilities', 'prayerTimes'];
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
