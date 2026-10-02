<?php

namespace App\Http\Controllers;

use App\Http\Resources\EidJamaatResource;
use App\Models\EidJamaat;
use App\Support\EidSeason;
use App\Support\Geo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EidJamaatController extends Controller
{
    private const DEFAULT_RADIUS_KM = 10;

    private const MAX_RADIUS_KM = 100;

    /**
     * The configured Eid season, which tells the app when to show Eid pages.
     */
    public function season(): JsonResponse
    {
        return response()->json([
            'data' => EidSeason::current(),
        ]);
    }

    /**
     * Published Eid jamaats near a point, soonest first and then closest.
     */
    public function nearby(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'radius' => ['sometimes', 'numeric', 'gt:0', 'lte:'.self::MAX_RADIUS_KM],
            'eid' => ['sometimes', 'string', Rule::in(EidJamaat::EIDS)],
            'year' => ['sometimes', 'integer', 'between:2000,2100'],
            'women' => ['sometimes', 'boolean'],
        ]);

        $season = EidSeason::current();
        $eid = $validated['eid'] ?? $season['eid'] ?? null;
        $year = (int) ($validated['year'] ?? $season['year'] ?? 0);

        if ($eid === null || $year === 0) {
            return response()->json(['data' => [], 'season' => $season]);
        }

        $latitude = (float) $validated['lat'];
        $longitude = (float) $validated['lng'];
        $radius = (float) ($validated['radius'] ?? self::DEFAULT_RADIUS_KM);

        // A cheap bounding box in SQL; the exact distance is checked below.
        // A jamaat away from the mosque is located by its own coordinates.
        $latitudeDelta = rad2deg($radius / Geo::EARTH_RADIUS_KM);
        $longitudeDelta = rad2deg($radius / (Geo::EARTH_RADIUS_KM * max(cos(deg2rad($latitude)), 0.01)));

        $jamaats = EidJamaat::query()
            ->with('mosque')
            ->select('eid_jamaats.*')
            ->join('mosques', 'mosques.id', '=', 'eid_jamaats.mosque_id')
            ->published()
            ->forSeason($eid, $year)
            ->when($validated['women'] ?? false, fn ($query) => $query->where('women_arrangement', true))
            ->where(function ($query) use ($latitude, $longitude, $latitudeDelta, $longitudeDelta): void {
                $box = fn (string $table) => fn ($query) => $query
                    ->whereBetween("{$table}.latitude", [$latitude - $latitudeDelta, $latitude + $latitudeDelta])
                    ->whereBetween("{$table}.longitude", [$longitude - $longitudeDelta, $longitude + $longitudeDelta]);

                $query
                    ->where(fn ($query) => $query->whereNotNull('eid_jamaats.latitude')->where($box('eid_jamaats')))
                    ->orWhere(fn ($query) => $query->whereNull('eid_jamaats.latitude')->where($box('mosques')));
            })
            ->get()
            ->map(function (EidJamaat $jamaat) use ($latitude, $longitude): array {
                $place = $jamaat->hasOwnLocation() ? $jamaat : $jamaat->mosque;

                return [
                    'jamaat' => $jamaat,
                    'distance' => Geo::distanceKm($latitude, $longitude, (float) $place->latitude, (float) $place->longitude),
                ];
            })
            ->filter(fn (array $item): bool => $item['distance'] <= $radius)
            ->sort(fn (array $first, array $second): int => [
                $first['jamaat']->date->toDateString(),
                $first['jamaat']->jamaat_time,
                $first['distance'],
                $first['jamaat']->id,
            ] <=> [
                $second['jamaat']->date->toDateString(),
                $second['jamaat']->jamaat_time,
                $second['distance'],
                $second['jamaat']->id,
            ])
            ->map(fn (array $item): array => (new EidJamaatResource($item['jamaat'], $item['distance']))->resolve())
            ->values();

        return response()->json([
            'data' => $jamaats,
            'season' => $season,
        ]);
    }
}
