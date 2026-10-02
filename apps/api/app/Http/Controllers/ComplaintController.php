<?php

namespace App\Http\Controllers;

use App\Http\Resources\ComplaintResource;
use App\Models\Complaint;
use App\Models\Mosque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Private feedback from a member of the community to a mosque.
 */
class ComplaintController extends Controller
{
    public function store(Request $request, Mosque $mosque): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['required', Rule::in(Complaint::CATEGORIES)],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'min:10', 'max:5000'],
            'is_anonymous' => ['sometimes', 'boolean'],
        ]);

        $complaint = $mosque->complaints()->create([
            ...$validated,
            'is_anonymous' => $request->boolean('is_anonymous'),
            'user_id' => $request->user()->id,
            'status' => Complaint::STATUS_OPEN,
        ]);

        return response()->json([
            'message' => 'Your feedback has been sent to the mosque.',
            'data' => new ComplaintResource($complaint->load(['mosque:id,name', 'user:id,name'])),
        ], 201);
    }

    /**
     * The current user's feedback with the mosques' responses.
     */
    public function mine(Request $request): AnonymousResourceCollection
    {
        return ComplaintResource::collection(
            Complaint::query()
                ->where('user_id', $request->user()->id)
                ->with(['mosque:id,name', 'user:id,name'])
                ->latest('id')
                ->get(),
        );
    }
}
