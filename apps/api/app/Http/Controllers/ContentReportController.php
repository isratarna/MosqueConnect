<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\Mosque;
use App\Models\SystemSetting;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContentReportController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $reportsEnabled = SystemSetting::query()->find('reports_enabled')?->value ?? true;

        abort_unless($reportsEnabled, 503, 'Content reporting is temporarily unavailable.');

        $validated = $request->validate([
            'reportable_type' => ['required', Rule::in(ContentReport::TYPES)],
            'reportable_id' => ['required', 'integer', 'min:1'],
            'category' => ['required', Rule::in(ContentReport::CATEGORIES)],
            'reason' => ['required', 'string', 'max:255'],
            'details' => ['nullable', 'string', 'max:5000'],
        ]);

        abort_unless($this->target($validated['reportable_type'], $validated['reportable_id']), 404, 'Reported content was not found.');

        $report = ContentReport::query()->create([
            ...$validated,
            'reporter_id' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Your report has been submitted for review.',
            'data' => $report,
        ], 201);
    }

    private function target(string $type, int $id): ?Model
    {
        $model = match ($type) {
            'announcement' => Announcement::class,
            'event' => Event::class,
            'campaign' => Campaign::class,
            'mosque' => Mosque::class,
        };

        return $model::query()->find($id);
    }
}
