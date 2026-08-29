<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\Event;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContentModerationController extends Controller
{
    private const TYPES = ['announcement', 'event', 'campaign'];

    private const STATUSES = ['pending', 'approved', 'rejected'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'type' => ['required', Rule::in(self::TYPES)],
            'moderation_status' => ['nullable', Rule::in(self::STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $model = $this->modelClass($filters['type']);
        $items = $model::query()
            ->with('mosque:id,name,verification_status')
            ->withCount(['contentReports as reports_count' => fn (Builder $query) => $query->whereIn('status', ['pending', 'reviewing'])])
            ->when($filters['moderation_status'] ?? null, fn (Builder $query, string $status) => $query->where('moderation_status', $status))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where('title', 'like', "%{$search}%"))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20);

        return response()->json($items);
    }

    public function update(Request $request, string $type, int $id): JsonResponse
    {
        abort_unless(in_array($type, self::TYPES, true), 404);
        $validated = $request->validate([
            'moderation_status' => ['required', Rule::in(self::STATUSES)],
            'moderation_note' => ['nullable', 'string', 'max:5000', 'required_if:moderation_status,rejected'],
        ]);

        $model = $this->modelClass($type);
        /** @var Model $item */
        $item = $model::query()->findOrFail($id);
        $before = $item->getAttribute('moderation_status');
        $item->update($validated);

        AdminAuditLog::record($request->user(), 'content.moderated', $item, [
            'content_type' => $type,
            'before' => $before,
            'after' => $item->getAttribute('moderation_status'),
            'moderation_note' => $validated['moderation_note'] ?? null,
        ]);

        return response()->json([
            'message' => 'Content moderation status updated.',
            'data' => $item->fresh()->load('mosque:id,name,verification_status'),
        ]);
    }

    /** @return class-string<Model> */
    private function modelClass(string $type): string
    {
        return match ($type) {
            'announcement' => Announcement::class,
            'event' => Event::class,
            'campaign' => Campaign::class,
        };
    }
}
