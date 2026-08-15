<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Mosque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MosqueManagementController extends Controller
{
    public function show(Mosque $mosque): JsonResponse
    {
        Gate::authorize('view', $mosque);

        return response()->json([
            'mosque' => $mosque,
        ]);
    }

    public function update(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('update', $mosque);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'string'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
        ]);

        $mosque->fill($validated);
        $mosque->save();

        return response()->json([
            'mosque' => $mosque->refresh(),
        ]);
    }
}
