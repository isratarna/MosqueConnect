<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\Event;
use App\Models\MosqueReview;
use App\Services\MosqueReviewService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContentModerationController extends Controller
{
    private const TYPES = ['announcement', 'event', 'campaign', 'review'];

    private const STATUSES = ['pending', 'approved', 'rejected'];

    public function __construct(private readonly MosqueReviewService $reviews) {}

    public function index(Request $request): JsonResponse
    {
        $statuses = $request->query('type') === 'review' ? MosqueReview::MODERATION_STATUSES : self::STATUSES;
        $filters = $request->validate([
            'type' => ['required', Rule::in(self::TYPES)],
            'moderation_status' => ['nullable', Rule::in($statuses)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $model = $this->modelClass($filters['type']);
        $query = $model::query()
            ->with('mosque:id,name,verification_status');
        if ($filters['type'] === 'review') {
            $query->with('user:id,name');
        }

        $items = $query
            ->withCount(['contentReports as reports_count' => fn (Builder $query) => $query->whereIn('status', ['pending', 'reviewing'])])
            ->when($filters['moderation_status'] ?? null, fn (Builder $query, string $status) => $query->where('moderation_status', $status))
            ->when($filters['search'] ?? null, function (Builder $query, string $search) use ($filters): void {
                $query->where($filters['type'] === 'review' ? 'comment' : 'title', 'like', "%{$search}%");
            })
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20)
            ->through(function (Model $item) use ($filters): Model {
                if ($filters['type'] === 'review' && $item instanceof MosqueReview) {
                    $item->setAttribute('title', 'Review by '.($item->user?->name ?? 'user'));
                    $item->setAttribute('body', $item->comment);
                    $item->setAttribute('status', 'submitted');
                }

                return $item;
            });

        return response()->json($items);
    }

    public function update(Request $request, string $type, int $id): JsonResponse
    {
        abort_unless(in_array($type, self::TYPES, true), 404);
        $statuses = $type === 'review' ? MosqueReview::MODERATION_STATUSES : self::STATUSES;
        $validated = $request->validate([
            'moderation_status' => ['required', Rule::in($statuses)],
            'moderation_note' => ['nullable', 'string', 'max:5000', 'required_if:moderation_status,rejected'],
        ]);

        $model = $this->modelClass($type);
        /** @var Model $item */
        $item = $model::query()->findOrFail($id);
        $before = $item->getAttribute('moderation_status');
        if ($item instanceof MosqueReview) {
            $item = $this->reviews->setModerationStatus($item, $validated['moderation_status']);
        } else {
            $item->update($validated);
        }

        AdminAuditLog::record($request->user(), $type === 'review' ? 'review.moderated' : 'content.moderated', $item, [
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
            'review' => MosqueReview::class,
        };
    }
}
