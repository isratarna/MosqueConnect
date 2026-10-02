<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\MosqueSuggestionResource;
use App\Models\MosqueSuggestion;
use App\Services\MosqueSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MosqueSuggestionManagementController extends Controller
{
    public function __construct(private readonly MosqueSuggestionService $suggestions) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', 'nullable', Rule::in(MosqueSuggestion::STATUSES)],
            'per_page' => ['sometimes', 'integer', 'between:1,50'],
        ]);
        $suggestions = MosqueSuggestion::query()
            ->with(['user:id,name,phone', 'reviewer:id,name', 'mosque:id,name'])
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20);

        return response()->json(MosqueSuggestionResource::collection($suggestions));
    }

    public function approve(Request $request, MosqueSuggestion $suggestion): JsonResponse
    {
        $updated = $this->suggestions->approve($request->user(), $suggestion);

        return response()->json([
            'message' => 'Mosque suggestion approved.',
            'data' => new MosqueSuggestionResource($updated),
        ]);
    }

    public function reject(Request $request, MosqueSuggestion $suggestion): JsonResponse
    {
        $validated = $request->validate(['review_note' => ['required', 'string', 'max:5000']]);
        $updated = $this->suggestions->reject($request->user(), $suggestion, $validated['review_note']);

        return response()->json([
            'message' => 'Mosque suggestion rejected.',
            'data' => new MosqueSuggestionResource($updated),
        ]);
    }
}
