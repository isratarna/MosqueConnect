<?php

namespace App\Http\Controllers;

use App\Services\SearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SearchController extends Controller
{
    public function __construct(private readonly SearchService $search) {}

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
            'types' => ['sometimes', 'array'],
            'types.*' => [Rule::in(SearchService::TYPES)],
        ]);

        return response()->json([
            'query' => trim($validated['q']),
            'data' => $this->search->search($validated['q'], $validated['types'] ?? SearchService::TYPES),
        ]);
    }
}
