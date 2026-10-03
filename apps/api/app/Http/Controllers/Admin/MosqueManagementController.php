<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PrayerScheduleResource;
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
            'data' => (new PrayerScheduleResource($mosque))->resolve(),
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
            'data' => (new PrayerScheduleResource($mosque))->resolve(),
        ]);
    }
}
