<?php

namespace App\Http\Controllers;

use App\Http\Resources\MosqueReviewResource;
use App\Models\Mosque;
use App\Models\MosqueReview;
use App\Services\MosqueReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MosqueReviewController extends Controller
{
    public function __construct(private readonly MosqueReviewService $reviews) {}

    public function index(Request $request, Mosque $mosque): AnonymousResourceCollection
    {
        $filters = $request->validate(['per_page' => ['sometimes', 'integer', 'between:1,50']]);
        $reviews = $mosque->reviews()
            ->where('moderation_status', MosqueReview::MODERATION_APPROVED)
            ->with('user:id,name')
            ->latest('created_at')
            ->latest('id')
            ->paginate($filters['per_page'] ?? 10);

        return MosqueReviewResource::collection($reviews);
    }

    public function upsert(Request $request, Mosque $mosque): JsonResponse
    {
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);
        $review = $this->reviews->upsert($mosque, $request->user(), $validated);

        return response()->json([
            'message' => 'Your mosque review has been saved.',
            'data' => new MosqueReviewResource($review),
        ]);
    }

    public function destroy(Request $request, Mosque $mosque): JsonResponse
    {
        abort_unless($this->reviews->delete($mosque, $request->user()), 404, 'You have not reviewed this mosque.');

        return response()->json(['message' => 'Your mosque review has been removed.']);
    }
}
