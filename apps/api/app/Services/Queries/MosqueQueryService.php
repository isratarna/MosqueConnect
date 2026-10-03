<?php

namespace App\Services\Queries;

use App\Models\Mosque;
use App\Support\Geo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MosqueQueryService
{
    /** @return Collection<int, array{district: string, areas: list<string>}> */
    public function filters(): Collection
    {
        return Mosque::query()
            ->select(['district', 'area'])
            ->whereNotNull('district')
            ->whereNotNull('area')
            ->groupBy('district', 'area')
            ->orderBy('district')
            ->orderBy('area')
            ->get()
            ->groupBy('district')
            ->map(fn ($areas, $district): array => [
                'district' => $district,
                'areas' => $areas->pluck('area')->values()->all(),
            ])
            ->values();
    }

    /** @return EloquentCollection<int, Mosque>|Collection<int, Mosque> */
    public function nearby(float $lat, float $lng, float $radiusKm): Collection
    {
        $query = $this->listingQuery();

        if (DB::connection()->getDriverName() === 'sqlite') {
            return $query->get()
                ->filter(fn (Mosque $mosque): bool => $this->hasValidCoordinates($mosque))
                ->map(function (Mosque $mosque) use ($lat, $lng): Mosque {
                    $mosque->setAttribute('distance_km', Geo::distanceKm($lat, $lng, (float) $mosque->latitude, (float) $mosque->longitude));

                    return $mosque;
                })
                ->filter(fn (Mosque $mosque): bool => $mosque->distance_km <= $radiusKm)
                ->sort(fn (Mosque $first, Mosque $second): int => [$first->distance_km, $first->id] <=> [$second->distance_km, $second->id])
                ->values();
        }

        $expression = $this->distanceExpression();

        return $query
            ->selectRaw($expression.' as distance_km', [$lat, $lng, $lat])
            ->whereBetween('latitude', [-90, 90])
            ->whereBetween('longitude', [-180, 180])
            ->whereRaw($expression.' <= ?', [$lat, $lng, $lat, $radiusKm])
            ->orderBy('distance_km')
            ->orderBy('id')
            ->get();
    }

    /** @param array<string, mixed> $filters */
    public function search(array $filters): LengthAwarePaginator
    {
        $query = $this->listingQuery();
        $this->applyFilters($query, $filters);

        $hasCoordinates = isset($filters['lat'], $filters['lng']);
        $sort = $filters['sort'] ?? 'name';
        $driver = DB::connection()->getDriverName();

        if ($hasCoordinates) {
            $query->whereBetween('latitude', [-90, 90])->whereBetween('longitude', [-180, 180]);
            if ($driver !== 'sqlite') {
                $query->selectRaw($this->distanceExpression().' as distance_km', [
                    (float) $filters['lat'],
                    (float) $filters['lng'],
                    (float) $filters['lat'],
                ]);
            }
        }

        if ($sort === 'distance' && $driver === 'sqlite') {
            $results = $query->get()
                ->map(function (Mosque $mosque) use ($filters): Mosque {
                    $mosque->setAttribute('distance_km', Geo::distanceKm((float) $filters['lat'], (float) $filters['lng'], (float) $mosque->latitude, (float) $mosque->longitude));

                    return $mosque;
                })
                ->sort(fn (Mosque $first, Mosque $second): int => [$first->distance_km, $first->id] <=> [$second->distance_km, $second->id])
                ->values();

            return $this->paginateCollection($results, (int) $filters['per_page']);
        }

        match ($sort) {
            'distance' => $query->orderBy('distance_km')->orderBy('id'),
            'rating' => $query->orderByRaw('rating_avg IS NULL')->orderByDesc('rating_avg')->orderBy('id'),
            default => $query->orderBy('name')->orderBy('id'),
        };

        $paginator = $query->paginate((int) $filters['per_page']);
        if ($hasCoordinates && $driver === 'sqlite') {
            $paginator->getCollection()->each(function (Mosque $mosque) use ($filters): void {
                $mosque->setAttribute('distance_km', Geo::distanceKm((float) $filters['lat'], (float) $filters['lng'], (float) $mosque->latitude, (float) $mosque->longitude));
            });
        }

        return $paginator;
    }

    /**
     * Base query for the public mosque listings. Schedule periods are eager
     * loaded because every listed mosque reports the period that covers today,
     * which would otherwise be a query per mosque.
     */
    private function listingQuery(): Builder
    {
        return Mosque::query()
            ->with(['facilities', 'prayerTimes', 'schedulePeriods.prayerTimes'])
            ->withCount('followers')
            ->withMax('prayerTimes', 'updated_at')
            ->withMax('jumuahSessions', 'updated_at');
    }

    /** @param array<string, mixed> $filters */
    private function applyFilters(Builder $query, array $filters): void
    {
        $query->search($filters['search'] ?? null)
            ->withFacilities($filters['facilities'] ?? [])
            ->inDistrict($filters['district'] ?? null)
            ->inArea($filters['area'] ?? null);

        if (array_key_exists('verified', $filters)) {
            $verified = filter_var($filters['verified'], FILTER_VALIDATE_BOOLEAN);
            if ($verified) {
                $query->where('verification_status', Mosque::VERIFICATION_VERIFIED);
            } else {
                $query->where('verification_status', '!=', Mosque::VERIFICATION_VERIFIED);
            }
        }

        if (filled($filters['bounds'] ?? null)) {
            [$south, $west, $north, $east] = array_map('floatval', explode(',', $filters['bounds']));
            $query->whereBetween('latitude', [$south, $north])->whereBetween('longitude', [$west, $east]);
        }
    }

    private function distanceExpression(): string
    {
        return sprintf(
            '%d * ACOS(LEAST(1, GREATEST(-1, COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(latitude)))))',
            Geo::EARTH_RADIUS_KM,
        );
    }

    private function hasValidCoordinates(Mosque $mosque): bool
    {
        return is_numeric($mosque->latitude) && is_numeric($mosque->longitude)
            && (float) $mosque->latitude >= -90 && (float) $mosque->latitude <= 90
            && (float) $mosque->longitude >= -180 && (float) $mosque->longitude <= 180;
    }

    /** @param Collection<int, Mosque> $results */
    private function paginateCollection(Collection $results, int $perPage): LengthAwarePaginator
    {
        $page = LengthAwarePaginator::resolveCurrentPage();
        $items = $results->slice(($page - 1) * $perPage, $perPage)->values();

        return new LengthAwarePaginator($items, $results->count(), $perPage, $page, [
            'path' => LengthAwarePaginator::resolveCurrentPath(),
            'query' => request()->query(),
        ]);
    }
}
