<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PrayerSchedulePeriodResource;
use App\Models\Mosque;
use App\Models\PrayerSchedulePeriod;
use App\Services\MosqueEditor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class PrayerSchedulePeriodController extends Controller
{
    public function index(Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('managePrayerTimes', $mosque);

        $periods = $mosque->schedulePeriods()
            ->with(['prayerTimes', 'ramadanTimings'])
            ->orderBy('starts_on')
            ->orderBy('id')
            ->get();

        return PrayerSchedulePeriodResource::collection($periods);
    }

    public function store(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('managePrayerTimes', $mosque);
        $validated = $request->validate($this->periodRules());
        $this->rejectOverlap($mosque, $validated['starts_on'], $validated['ends_on']);
        $period = $mosque->schedulePeriods()->create($validated);

        return (new PrayerSchedulePeriodResource($period->load('ramadanTimings')))
            ->additional(['message' => 'Schedule period created successfully.'])
            ->response()
            ->setStatusCode(201);
    }

    public function show(Mosque $mosque, PrayerSchedulePeriod $period): PrayerSchedulePeriodResource
    {
        Gate::authorize('managePrayerTimes', $mosque);
        $this->ensureOwnership($mosque, $period);

        return new PrayerSchedulePeriodResource($period->load(['prayerTimes', 'ramadanTimings']));
    }

    public function update(Request $request, Mosque $mosque, PrayerSchedulePeriod $period): PrayerSchedulePeriodResource
    {
        Gate::authorize('managePrayerTimes', $mosque);
        $this->ensureOwnership($mosque, $period);
        $validated = $request->validate($this->periodRules(partial: true));
        $this->rejectOverlap(
            $mosque,
            $validated['starts_on'] ?? $period->starts_on->toDateString(),
            $validated['ends_on'] ?? $period->ends_on->toDateString(),
            $period->id,
        );
        $period->update($validated);

        return new PrayerSchedulePeriodResource($period->refresh());
    }

    public function destroy(Mosque $mosque, PrayerSchedulePeriod $period): JsonResponse
    {
        Gate::authorize('managePrayerTimes', $mosque);
        $this->ensureOwnership($mosque, $period);
        $period->delete();

        return response()->json(['message' => 'Schedule period deleted successfully.']);
    }

    /**
     * Replace the daily times that apply while the period is in effect. The
     * default (period-less) schedule is untouched.
     *
     * @param  array<string, mixed>  $validated
     */
    public function updatePrayerTimes(Request $request, Mosque $mosque, PrayerSchedulePeriod $period): PrayerSchedulePeriodResource
    {
        Gate::authorize('managePrayerTimes', $mosque);
        $this->ensureOwnership($mosque, $period);
        $validated = $request->validate(MosqueEditor::prayerScheduleRules());
        abort_if(isset($validated['jumuah_sessions']), 422, 'Jumuah sessions are only supported on the default schedule.');

        DB::transaction(function () use ($period, $validated): void {
            $lock = PrayerSchedulePeriod::query()->lockForUpdate()->findOrFail($period->id);

            foreach ($validated['prayer_schedule'] ?? [] as $entry) {
                $lock->prayerTimes()->updateOrCreate(
                    ['prayer' => $entry['prayer']],
                    [
                        'mosque_id' => $period->mosque_id,
                        'adhan_time' => $entry['adhan_time'],
                        'jamaat_time' => $entry['jamaat_time'],
                    ],
                );
            }
        });

        return (new PrayerSchedulePeriodResource($period->refresh()->load('prayerTimes')))
            ->additional(['message' => 'Schedule period prayer times updated successfully.']);
    }

    /**
     * Replace the Ramadan day-by-day Sehri/Iftar/Taraweeh table, so an admin
     * can upload a whole month in one request.
     *
     * @param  array<string, mixed>  $validated
     */
    public function updateRamadanTimings(Request $request, Mosque $mosque, PrayerSchedulePeriod $period): PrayerSchedulePeriodResource
    {
        Gate::authorize('managePrayerTimes', $mosque);
        $this->ensureOwnership($mosque, $period);
        abort_unless($period->is_ramadan, 422, 'Ramadan timings require a Ramadan schedule period.');
        $validated = $request->validate([
            'ramadan_timings' => ['required', 'array', 'min:1', 'max:31'],
            'ramadan_timings.*.date' => ['required', 'date_format:Y-m-d', 'distinct'],
            'ramadan_timings.*.sehri_ends' => ['required', 'date_format:H:i'],
            'ramadan_timings.*.iftar' => ['required', 'date_format:H:i'],
            'ramadan_timings.*.taraweeh_time' => ['nullable', 'date_format:H:i'],
        ]);

        $this->rejectTimingsOutsidePeriod($period, $validated['ramadan_timings']);

        DB::transaction(function () use ($period, $validated): void {
            $lock = PrayerSchedulePeriod::query()->lockForUpdate()->findOrFail($period->id);
            $lock->ramadanTimings()->delete();
            $lock->ramadanTimings()->createMany($validated['ramadan_timings']);
        });

        return (new PrayerSchedulePeriodResource($period->refresh()->load('ramadanTimings')))
            ->additional(['message' => 'Ramadan timings updated successfully.']);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    private function periodRules(bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'name' => [$required, 'string', 'max:255'],
            'starts_on' => [$required, 'date_format:Y-m-d'],
            'ends_on' => [$required, 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'is_ramadan' => [$required, 'boolean'],
        ];
    }

    /**
     * A date can only resolve to one timetable, so two periods of the same
     * mosque may not cover the same day.
     */
    private function rejectOverlap(Mosque $mosque, string $startsOn, string $endsOn, ?int $exceptId = null): void
    {
        $overlaps = $mosque->schedulePeriods()
            ->when($exceptId, fn ($query) => $query->whereKeyNot($exceptId))
            ->whereDate('starts_on', '<=', $endsOn)
            ->whereDate('ends_on', '>=', $startsOn)
            ->exists();

        if ($overlaps) {
            throw ValidationException::withMessages([
                'starts_on' => 'Schedule periods for a mosque cannot overlap.',
            ]);
        }
    }

    /**
     * @param  list<array<string, mixed>>  $timings
     */
    private function rejectTimingsOutsidePeriod(PrayerSchedulePeriod $period, array $timings): void
    {
        foreach ($timings as $timing) {
            if (! $period->covers($timing['date'])) {
                throw ValidationException::withMessages([
                    'ramadan_timings' => "Every timing date must fall within {$period->starts_on->toDateString()} and {$period->ends_on->toDateString()}.",
                ]);
            }
        }
    }

    private function ensureOwnership(Mosque $mosque, PrayerSchedulePeriod $period): void
    {
        abort_unless($period->mosque_id === $mosque->id, 404);
    }
}
