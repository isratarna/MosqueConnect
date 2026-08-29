<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\Mosque;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(ContentReport::STATUSES)],
            'type' => ['nullable', Rule::in(ContentReport::TYPES)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $reports = ContentReport::query()
            ->with(['reporter:id,name,phone', 'reviewer:id,name'])
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['type'] ?? null, fn (Builder $query, string $type) => $query->where('reportable_type', $type))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(fn (Builder $query) => $query->where('reason', 'like', "%{$search}%")->orWhere('details', 'like', "%{$search}%")))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20)
            ->through(function (ContentReport $report): ContentReport {
                $target = $this->target($report->reportable_type, $report->reportable_id);
                $report->setAttribute('target', $target ? [
                    'id' => $target->getKey(),
                    'title' => $target->getAttribute('title') ?? $target->getAttribute('name'),
                ] : null);

                return $report;
            });

        return response()->json($reports);
    }

    public function update(Request $request, ContentReport $contentReport): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(ContentReport::STATUSES)],
            'resolution_note' => ['nullable', 'string', 'max:5000', 'required_if:status,resolved,dismissed'],
        ]);

        $before = $contentReport->status;
        $isFinal = in_array($validated['status'], [ContentReport::STATUS_RESOLVED, ContentReport::STATUS_DISMISSED], true);
        $contentReport->update([
            ...$validated,
            'reviewer_id' => $request->user()->id,
            'reviewed_at' => $isFinal ? now() : null,
        ]);

        AdminAuditLog::record($request->user(), 'report.updated', $contentReport, [
            'before' => $before,
            'after' => $contentReport->status,
            'resolution_note' => $validated['resolution_note'] ?? null,
        ]);

        return response()->json([
            'message' => 'Report status updated.',
            'data' => $contentReport->fresh()->load(['reporter:id,name,phone', 'reviewer:id,name']),
        ]);
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
