<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\MosqueEditSuggestionResource;
use App\Models\Mosque;
use App\Models\MosqueEditSuggestion;
use App\Models\User;
use App\Services\MosqueSuggestionService;
use App\Support\MosqueAbility;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Review queues for suggested corrections: a mosque's own admins review the
 * mosques they run, the super admin reviews mosques nobody manages (and can
 * open the full queue).
 */
class SuggestionReviewController extends Controller
{
    public function __construct(private readonly MosqueSuggestionService $suggestions) {}

    public function mosqueIndex(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('reviewSuggestions', $mosque);

        $filters = $this->filters($request);
        $page = $mosque->editSuggestions()
            ->with(['user:id,name,accepted_suggestions_count', 'reviewer:id,name', 'mosque'])
            ->when($filters['status'] ?? MosqueEditSuggestion::STATUS_PENDING, fn ($query, $status) => $status === 'all' ? $query : $query->where('status', $status))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20);

        return $this->respond($page, $request->user());
    }

    public function mosqueAccept(Request $request, Mosque $mosque, MosqueEditSuggestion $suggestion): JsonResponse
    {
        $this->authorizeReview($mosque, $suggestion);

        return $this->accept($request, $suggestion);
    }

    public function mosqueReject(Request $request, Mosque $mosque, MosqueEditSuggestion $suggestion): JsonResponse
    {
        $this->authorizeReview($mosque, $suggestion);

        return $this->reject($request, $suggestion);
    }

    public function systemIndex(Request $request): JsonResponse
    {
        $filters = $this->filters($request) + $request->validate([
            'scope' => ['nullable', Rule::in(['unclaimed', 'all'])],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $query = MosqueEditSuggestion::query()
            ->with(['user:id,name,accepted_suggestions_count', 'reviewer:id,name', 'mosque'])
            ->when($filters['status'] ?? MosqueEditSuggestion::STATUS_PENDING, fn ($query, $status) => $status === 'all' ? $query : $query->where('status', $status))
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->whereHas('mosque', fn ($mosque) => $mosque->where('name', 'like', "%{$search}%")))
            ->latest('id');

        if (($filters['scope'] ?? 'unclaimed') === 'unclaimed') {
            $this->suggestions->whereUnmanaged($query);
        }

        return $this->respond($query->paginate($filters['per_page'] ?? 20), $request->user());
    }

    public function systemAccept(Request $request, MosqueEditSuggestion $suggestion): JsonResponse
    {
        return $this->accept($request, $suggestion);
    }

    public function systemReject(Request $request, MosqueEditSuggestion $suggestion): JsonResponse
    {
        return $this->reject($request, $suggestion);
    }

    /**
     * @return array<string, mixed>
     */
    private function filters(Request $request): array
    {
        return $request->validate([
            'status' => ['nullable', Rule::in([...MosqueEditSuggestion::STATUSES, 'all'])],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);
    }

    private function authorizeReview(Mosque $mosque, MosqueEditSuggestion $suggestion): void
    {
        abort_unless((int) $suggestion->mosque_id === (int) $mosque->id, 404);

        $ability = MosqueAbility::forSuggestionField($suggestion->field) === MosqueAbility::PRAYER_TIMES ? 'managePrayerTimes' : 'update';
        Gate::authorize($ability, $mosque);
    }

    private function accept(Request $request, MosqueEditSuggestion $suggestion): JsonResponse
    {
        $validated = $request->validate(['review_note' => ['nullable', 'string', 'max:1000']]);

        $accepted = $this->suggestions->accept($suggestion, $request->user(), $validated['review_note'] ?? null);

        return response()->json([
            'message' => $accepted->field === MosqueEditSuggestion::FIELD_OTHER
                ? 'Marked as accepted. Make the change by hand if anything needs updating.'
                : 'Correction accepted and applied.',
            'data' => (new MosqueEditSuggestionResource($accepted->load(['user', 'reviewer:id,name', 'mosque'])))->resolve(),
        ]);
    }

    private function reject(Request $request, MosqueEditSuggestion $suggestion): JsonResponse
    {
        $validated = $request->validate(['review_note' => ['nullable', 'string', 'max:1000']]);

        $rejected = $this->suggestions->reject($suggestion, $request->user(), $validated['review_note'] ?? null);

        return response()->json([
            'message' => 'Suggestion rejected.',
            'data' => (new MosqueEditSuggestionResource($rejected->load(['user', 'reviewer:id,name', 'mosque'])))->resolve(),
        ]);
    }

    /**
     * Each pending suggestion shows the mosque's value right now next to the
     * proposed one, and whether this reviewer's role lets them decide on it.
     */
    private function respond(LengthAwarePaginator $page, User $reviewer): JsonResponse
    {
        $items = collect($page->items())->map(function (MosqueEditSuggestion $suggestion) use ($reviewer): array {
            $current = $suggestion->isPending()
                ? $this->suggestions->currentValue($suggestion->mosque, $suggestion->field, $suggestion->payload)
                : null;
            $canReview = $suggestion->isPending()
                && MosqueAbility::allows($reviewer, $suggestion->mosque, MosqueAbility::forSuggestionField($suggestion->field));

            return (new MosqueEditSuggestionResource($suggestion, $current, $canReview))->resolve();
        });

        return response()->json([
            'data' => $items->all(),
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
        ]);
    }
}
