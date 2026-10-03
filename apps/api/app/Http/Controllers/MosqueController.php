<?php

namespace App\Http\Controllers;

use App\Http\Requests\MosqueIndexRequest;
use App\Http\Resources\MosqueResource;
use App\Http\Resources\PrayerScheduleResource;
use App\Models\Mosque;
use App\Models\MosqueEditSuggestion;
use App\Models\RamadanTiming;
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
            'paymentMethods' => fn ($query) => $query->where('is_active', true)->orderBy('sort_order')->orderBy('id'),
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

        // When the community last had a correction to the times accepted.
        $mosque->times_confirmed_at = $mosque->editSuggestions()
            ->accepted()
            ->whereIn('field', MosqueEditSuggestion::TIME_FIELDS)
            ->max('reviewed_at');

        return response()->json([
            'data' => (new MosqueResource($mosque, true))->resolve(),
        ]);
    }

    public function prayerSchedule(Request $request, Mosque $mosque, PrayerScheduleService $schedules): JsonResponse
    {
        $date = $this->resolveScheduleDate($request);
        $mosque->load(['prayerTimes', 'jumuahSessions', 'schedulePeriods.prayerTimes']);
        $period = $schedules->periodForDate($mosque, $date);

        return response()->json([
            'data' => (new PrayerScheduleResource(
                $mosque,
                $schedules->forDate($mosque, $date),
                $date->toDateString(),
                $period?->summary(),
            ))->resolve(),
        ]);
    }

    public function ramadan(Request $request, Mosque $mosque, PrayerScheduleService $schedules): JsonResponse
    {
        $date = $this->resolveScheduleDate($request);
        $period = $schedules->periodForDate($mosque, $date);

        abort_unless($period?->is_ramadan, 404);

        $timings = $period->load('ramadanTimings')->ramadanTimings
            ->map(fn (RamadanTiming $timing): array => [
                'date' => $timing->date->toDateString(),
                'sehri_ends' => substr((string) $timing->sehri_ends, 0, 5),
                'iftar' => substr((string) $timing->iftar, 0, 5),
                'taraweeh_time' => $timing->taraweeh_time === null ? null : substr((string) $timing->taraweeh_time, 0, 5),
            ])
            ->keyBy('date');

        return response()->json([
            'data' => [
                'period' => $period->summary(),
                'date' => $date->toDateString(),
                'today' => $timings->get($date->toDateString()),
                'timings' => $timings->values(),
            ],
        ]);
    }

    /**
     * The requested prayer schedule date, defaulting to today in the mosque's
     * prayer timezone rather than the server's.
     */
    private function resolveScheduleDate(Request $request): CarbonImmutable
    {
        $validated = $request->validate(['date' => ['sometimes', 'date_format:Y-m-d']]);

        if (! isset($validated['date'])) {
            return CarbonImmutable::now(config('prayer.timezone'));
        }

        return CarbonImmutable::createFromFormat('!Y-m-d', $validated['date'], config('prayer.timezone'));
    }
}
