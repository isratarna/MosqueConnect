<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\EidJamaatResource;
use App\Jobs\NotifyEidJamaatsPublished;
use App\Models\EidJamaat;
use App\Models\Mosque;
use App\Support\EidSeason;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EidJamaatManagementController extends Controller
{
    private const MAX_SEQUENCE = 20;

    public function index(Mosque $mosque): JsonResponse
    {
        Gate::authorize('view', $mosque);

        $jamaats = $mosque->eidJamaats()
            ->reorder()
            ->orderByDesc('year')
            ->orderBy('eid')
            ->orderBy('date')
            ->orderBy('jamaat_time')
            ->orderBy('sequence')
            ->get();

        return response()->json([
            'data' => $jamaats
                ->map(fn (EidJamaat $jamaat): array => (new EidJamaatResource($jamaat->setRelation('mosque', $mosque)))->resolve())
                ->values(),
            'season' => EidSeason::current(),
        ]);
    }

    public function store(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('update', $mosque);

        $validated = $request->validate($this->rules(true));

        $jamaat = DB::transaction(function () use ($mosque, $validated): EidJamaat {
            Mosque::query()->whereKey($mosque->id)->lockForUpdate()->firstOrFail();

            $attributes = $this->attributes($validated);
            $attributes['sequence'] = $this->sequenceFor($mosque, $attributes['eid'], $attributes['year'], $validated['sequence'] ?? null);

            return $mosque->eidJamaats()->create($attributes);
        });

        return response()->json([
            'message' => 'Eid jamaat added. Publish to show it to the public.',
            'data' => (new EidJamaatResource($jamaat->setRelation('mosque', $mosque)))->resolve(),
        ], 201);
    }

    public function update(Request $request, Mosque $mosque, EidJamaat $eidJamaat): JsonResponse
    {
        Gate::authorize('update', $mosque);

        $validated = $request->validate($this->rules(false));

        DB::transaction(function () use ($mosque, $eidJamaat, $validated): void {
            Mosque::query()->whereKey($mosque->id)->lockForUpdate()->firstOrFail();

            $attributes = $this->attributes($validated, $eidJamaat);
            $eid = $attributes['eid'] ?? $eidJamaat->eid;
            $year = $attributes['year'] ?? $eidJamaat->year;
            $movedSeason = $eid !== $eidJamaat->eid || $year !== $eidJamaat->year;

            if (array_key_exists('sequence', $validated) || $movedSeason) {
                $attributes['sequence'] = $this->sequenceFor(
                    $mosque,
                    $eid,
                    $year,
                    $validated['sequence'] ?? ($movedSeason ? null : $eidJamaat->sequence),
                    $eidJamaat,
                );
            }

            $eidJamaat->fill($attributes)->save();
        });

        return response()->json([
            'message' => 'Eid jamaat updated.',
            'data' => (new EidJamaatResource($eidJamaat->refresh()->setRelation('mosque', $mosque)))->resolve(),
        ]);
    }

    public function destroy(Mosque $mosque, EidJamaat $eidJamaat): JsonResponse
    {
        Gate::authorize('update', $mosque);

        $eidJamaat->delete();

        return response()->json(['message' => 'Eid jamaat deleted.']);
    }

    /**
     * Publish every draft jamaat for one Eid and notify followers.
     */
    public function publish(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('update', $mosque);

        $validated = $request->validate([
            'eid' => ['required', 'string', Rule::in(EidJamaat::EIDS)],
            'year' => ['required', 'integer', 'between:2000,2100'],
        ]);

        $season = fn () => EidJamaat::query()
            ->whereBelongsTo($mosque)
            ->forSeason($validated['eid'], (int) $validated['year']);

        if (! $season()->exists()) {
            throw ValidationException::withMessages([
                'eid' => 'Add at least one Eid jamaat before publishing.',
            ]);
        }

        $published = $season()->whereNull('published_at')->update(['published_at' => now()]);

        if ($published > 0) {
            NotifyEidJamaatsPublished::dispatch($mosque, $validated['eid'], (int) $validated['year']);
        }

        return response()->json([
            'message' => $published > 0
                ? 'Eid jamaat times published. Followers will be notified.'
                : 'All Eid jamaats for this Eid were already published.',
            'published_count' => $published,
            'data' => $season()->orderBy('date')->orderBy('jamaat_time')->orderBy('sequence')->get()
                ->map(fn (EidJamaat $jamaat): array => (new EidJamaatResource($jamaat->setRelation('mosque', $mosque)))->resolve())
                ->values(),
        ]);
    }

    /**
     * @return array<string, list<mixed>>
     */
    private function rules(bool $creating): array
    {
        $required = $creating ? 'required' : 'sometimes';

        return [
            'eid' => [$required, 'string', Rule::in(EidJamaat::EIDS)],
            'date' => [$required, 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before:2101-01-01'],
            'jamaat_time' => [$required, 'date_format:H:i'],
            'sequence' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:'.self::MAX_SEQUENCE],
            'location_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'khutbah_language' => ['sometimes', 'nullable', 'string', 'max:50'],
            'women_arrangement' => ['sometimes', 'boolean'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * The model attributes for validated input. The year always follows the date.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function attributes(array $validated, ?EidJamaat $existing = null): array
    {
        $attributes = collect($validated)->except('sequence')->all();

        if (isset($validated['date'])) {
            $attributes['year'] = CarbonImmutable::parse($validated['date'])->year;
        }

        if ($existing === null) {
            $attributes['women_arrangement'] ??= false;
        }

        return $attributes;
    }

    /**
     * The requested order number, or the next free one, for a mosque's Eid.
     */
    private function sequenceFor(Mosque $mosque, string $eid, int $year, ?int $requested, ?EidJamaat $ignore = null): int
    {
        $taken = $mosque->eidJamaats()
            ->forSeason($eid, $year)
            ->when($ignore, fn ($query) => $query->whereKeyNot($ignore->id))
            ->pluck('sequence');

        if ($requested !== null) {
            if ($taken->contains($requested)) {
                throw ValidationException::withMessages([
                    'sequence' => 'Another jamaat for this Eid already uses this order number.',
                ]);
            }

            return $requested;
        }

        $next = (int) $taken->max() + 1;

        if ($next > self::MAX_SEQUENCE) {
            throw ValidationException::withMessages([
                'sequence' => 'A mosque can list at most '.self::MAX_SEQUENCE.' jamaats for one Eid.',
            ]);
        }

        return $next;
    }
}
