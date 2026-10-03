<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Mosque;
use App\Services\MosqueInsightsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class MosqueInsightsController extends Controller
{
    public function show(Request $request, Mosque $mosque, MosqueInsightsService $insights): JsonResponse
    {
        Gate::authorize('manageContent', $mosque);

        $validated = $request->validate([
            'range' => ['sometimes', 'string', Rule::in(array_keys(MosqueInsightsService::RANGES))],
        ]);

        return response()->json([
            'data' => $insights->forRange($mosque, $validated['range'] ?? '30d'),
        ]);
    }
}
