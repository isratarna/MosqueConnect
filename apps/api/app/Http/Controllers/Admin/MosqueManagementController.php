<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PrayerScheduleResource;
use App\Models\Mosque;
use App\Models\MosqueFacility;
use App\Models\PrayerTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class MosqueManagementController extends Controller
{
    public function show(Mosque $mosque): JsonResponse
    {
        Gate::authorize('view', $mosque);

        return response()->json([
            'mosque' => $mosque->load('facilities'),
        ]);
    }

    public function update(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('update', $mosque);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'string'],
            'district' => ['sometimes', 'nullable', 'string', 'max:100'],
            'area' => ['sometimes', 'nullable', 'string', 'max:100'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'facilities' => ['sometimes', 'array'],
            'facilities.*' => ['required', 'string', 'distinct', Rule::in(MosqueFacility::KEYS)],
        ]);

        DB::transaction(function () use ($mosque, $validated): void {
            $locked = Mosque::query()->lockForUpdate()->findOrFail($mosque->id);
            $profile = $validated;
            unset($profile['facilities']);
            $locked->fill($profile)->save();
            if (array_key_exists('facilities', $validated)) {
                $locked->facilities()->whereNotIn('facility_key', $validated['facilities'])->delete();
                foreach ($validated['facilities'] as $key) {
                    $locked->facilities()->firstOrCreate(['facility_key' => $key]);
                }
            }
        });

        return response()->json([
            'mosque' => $mosque->refresh()->load('facilities'),
        ]);
    }

    public function prayerSchedule(Mosque $mosque): JsonResponse
    {
        Gate::authorize('view', $mosque);

        $mosque->load(['prayerTimes', 'jumuahSessions']);

        return response()->json([
            'data' => (new PrayerScheduleResource($mosque))->resolve(),
        ]);
    }

    public function updatePrayerSchedule(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('update', $mosque);

        $validated = $request->validate([
            'prayer_schedule' => ['sometimes', 'array'],
            'prayer_schedule.*.prayer' => ['required_with:prayer_schedule', 'string', Rule::in(PrayerTime::PRAYERS)],
            'prayer_schedule.*.adhan_time' => ['required_with:prayer_schedule', 'date_format:H:i'],
            'prayer_schedule.*.jamaat_time' => ['required_with:prayer_schedule', 'date_format:H:i'],
            'jumuah_sessions' => ['sometimes', 'array'],
            'jumuah_sessions.*.sequence' => ['required_with:jumuah_sessions', 'integer', 'min:1'],
            'jumuah_sessions.*.label' => ['required_with:jumuah_sessions', 'string', 'max:255'],
            'jumuah_sessions.*.khutbah_time' => ['nullable', 'date_format:H:i'],
            'jumuah_sessions.*.jamaat_time' => ['required_with:jumuah_sessions', 'date_format:H:i'],
            'jumuah_sessions.*.notes' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($mosque, $validated): void {
            $lock = Mosque::query()->whereKey($mosque->id)->lockForUpdate()->firstOrFail();
            $schedule = $validated['prayer_schedule'] ?? [];

            foreach ($schedule as $entry) {
                $lock->prayerTimes()->updateOrCreate(
                    ['prayer' => $entry['prayer']],
                    [
                        'adhan_time' => $entry['adhan_time'],
                        'jamaat_time' => $entry['jamaat_time'],
                    ],
                );
            }

            $sessions = $validated['jumuah_sessions'] ?? [];
            foreach ($sessions as $entry) {
                $lock->jumuahSessions()->updateOrCreate(
                    ['sequence' => (int) $entry['sequence']],
                    [
                        'label' => $entry['label'],
                        'khutbah_time' => $entry['khutbah_time'] ?? null,
                        'jamaat_time' => $entry['jamaat_time'],
                        'notes' => $entry['notes'] ?? null,
                    ],
                );
            }
        });

        $mosque->load(['prayerTimes', 'jumuahSessions']);

        return response()->json([
            'message' => 'Prayer schedule updated successfully.',
            'data' => (new PrayerScheduleResource($mosque))->resolve(),
        ]);
    }
}
