<?php

namespace App\Http\Controllers;

use App\Http\Requests\MosqueIndexRequest;
use App\Http\Resources\MosqueResource;
use App\Http\Resources\PrayerScheduleResource;
use App\Models\Mosque;
use App\Services\PrayerScheduleService;
use App\Services\Queries\MosqueQueryService;
use App\Support\EidSeason;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MosqueController extends Controller
{
    private const DEFAULT_RADIUS_KM = 20;

    private const MAX_RADIUS_KM = 100;

    public function __construct(private readonly MosqueQueryService $mosques) {}

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

        $mosques = $this->mosques->nearby($latitude, $longitude, $radius)
            ->map(fn (Mosque $mosque): array => (new MosqueResource($mosque, false, (float) $mosque->distance_km))->resolve());

        return response()->json([
            'data' => $mosques,
        ]);
    }

    public function index(MosqueIndexRequest $request): AnonymousResourceCollection
    {
        return MosqueResource::collection($this->mosques->search($request->validated()));
    }

    public function filters(): JsonResponse
    {
        return response()->json([
            'data' => $this->mosques->filters(),
        ]);
    }

    public function show(Mosque $mosque): JsonResponse
    {
        $mosque = Mosque::query()
            ->withMax('prayerTimes', 'updated_at')
            ->withMax('jumuahSessions', 'updated_at')
            ->findOrFail($mosque->id);

        $mosque->load([
            'facilities',
            'prayerTimes',
            'jumuahSessions',
            'photos',
            'publishedAnnouncements' => fn ($query) => $query->limit(5),
        ]);
        $mosque->loadCount([
            'followers',
            'announcements as announcements_count' => fn (Builder $query) => $query->published(),
            'events as upcoming_events_count' => fn (Builder $query) => $query->published()->whereDate('event_date', '>=', today()),
            'campaigns as active_campaigns_count' => fn (Builder $query) => $query->publiclyActive(),
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
            'data' => (new PrayerScheduleResource($mosque, $schedules->forDate($mosque, $date), $date->toDateString()))->resolve(),
        ]);
    }
}
