<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Mosque;
use App\Services\MosqueEditor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MosqueManagementController extends Controller
{
    public function show(Mosque $mosque): JsonResponse
    {
        Gate::authorize('view', $mosque);

        return response()->json([
            'mosque' => $mosque->load('facilities'),
        ]);
    }

    public function update(Request $request, Mosque $mosque, MosqueEditor $editor): JsonResponse
    {
        Gate::authorize('update', $mosque);

        $validated = $request->validate(MosqueEditor::profileRules());

        return response()->json([
            'mosque' => $editor->updateProfile($mosque, $validated),
        ]);
    }

    public function prayerSchedule(Mosque $mosque): JsonResponse
    {
        Gate::authorize('managePrayerTimes', $mosque);

        $mosque->load(['prayerTimes', 'jumuahSessions']);

        return response()->json([
            'data' => [
                'mosque_id' => $mosque->id,
                'prayer_schedule' => $mosque->prayerTimes
                    ->map(fn ($time): array => [
                        'id' => $time->id,
                        'prayer' => $time->prayer,
                        'label' => $time->label(),
                        'adhan_time' => $time->adhan_time ? substr($time->adhan_time, 0, 5) : null,
                        'jamaat_time' => $time->jamaat_time ? substr($time->jamaat_time, 0, 5) : null,
                    ])
                    ->values()
                    ->all(),
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

    public function updatePrayerSchedule(Request $request, Mosque $mosque, MosqueEditor $editor): JsonResponse
    {
        Gate::authorize('managePrayerTimes', $mosque);

        $validated = $request->validate(MosqueEditor::prayerScheduleRules());

        $editor->updatePrayerSchedule($mosque, $validated);

        $mosque->load(['prayerTimes', 'jumuahSessions']);

        return response()->json([
            'message' => 'Prayer schedule updated successfully.',
            'data' => [
                'mosque_id' => $mosque->id,
                'prayer_schedule' => $mosque->prayerTimes
                    ->map(fn ($time): array => [
                        'id' => $time->id,
                        'prayer' => $time->prayer,
                        'label' => $time->label(),
                        'adhan_time' => $time->adhan_time ? substr($time->adhan_time, 0, 5) : null,
                        'jamaat_time' => $time->jamaat_time ? substr($time->jamaat_time, 0, 5) : null,
                    ])
                    ->values()
                    ->all(),
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
}
