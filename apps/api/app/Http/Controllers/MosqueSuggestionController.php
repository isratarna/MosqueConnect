<?php

namespace App\Http\Controllers;

use App\Http\Resources\MosqueSuggestionResource;
use App\Models\MosqueFacility;
use App\Models\MosqueSuggestion;
use App\Services\MosqueSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class MosqueSuggestionController extends Controller
{
    public function __construct(private readonly MosqueSuggestionService $suggestions) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:2000'],
            'district' => ['required', 'string', 'max:100'],
            'area' => ['nullable', 'string', 'max:100'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'phone' => ['nullable', 'string', 'max:255'],
            'facilities' => ['nullable', 'array'],
            'facilities.*' => ['required', 'string', 'distinct', Rule::in(MosqueFacility::KEYS)],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $duplicate = $this->suggestions->duplicateNearby((float) $validated['latitude'], (float) $validated['longitude']);
        if ($duplicate) {
            return response()->json([
                'message' => 'A mosque already exists near this location. Claim it instead.',
                'mosque_id' => $duplicate->id,
            ], 409);
        }

        $suggestion = $this->suggestions->submit($request->user(), $validated);

        return response()->json([
            'message' => 'Mosque suggestion submitted for review.',
            'data' => new MosqueSuggestionResource($suggestion),
        ], 201);
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate(['per_page' => ['sometimes', 'integer', 'between:1,50']]);
        $suggestions = MosqueSuggestion::query()
            ->where('user_id', $request->user()->id)
            ->with('mosque')
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20);

        return MosqueSuggestionResource::collection($suggestions);
    }
}
