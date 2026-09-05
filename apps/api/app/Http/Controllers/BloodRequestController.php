<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBloodRequestRequest;
use App\Http\Requests\StoreBloodRequestResponseRequest;
use App\Http\Requests\UpdateBloodRequestStatusRequest;
use App\Http\Resources\BloodRequestResource;
use App\Http\Resources\BloodRequestResponseResource;
use App\Models\BloodRequest;
use App\Models\BloodRequestResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class BloodRequestController extends Controller
{
    public function responses(): JsonResponse
    {
        return response()->json(['data' => request()->user()->bloodRequestResponses()->get(['id', 'blood_request_id'])]);
    }

    /**
     * List active (open) blood requests available to the community.
     */
    public function index(): AnonymousResourceCollection
    {
        $requests = BloodRequest::query()
            ->active()
            ->with('creator')
            ->withCount('responses')
            ->orderByDesc('required_date')
            ->orderByDesc('id')
            ->get();

        return BloodRequestResource::collection($requests);
    }

    /**
     * Show a single blood request. Open requests are public; closed ones are
     * only visible to the creator or an authorized role.
     */
    public function show(BloodRequest $bloodRequest): BloodRequestResource
    {
        if (! $bloodRequest->isOpen() && ! $this->canViewClosed($bloodRequest)) {
            abort(404);
        }

        return new BloodRequestResource(
            $bloodRequest->load(['creator', 'responses.respondent'])
        );
    }

    /**
     * Create a new blood request.
     */
    public function store(StoreBloodRequestRequest $request): JsonResponse
    {
        $bloodRequest = BloodRequest::query()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'status' => BloodRequest::STATUS_ACTIVE,
        ]);

        return response()->json([
            'message' => 'Blood request created successfully.',
            'data' => new BloodRequestResource($bloodRequest->load('creator')),
        ], 201);
    }

    /**
     * List the authenticated user's own blood requests.
     */
    public function mine(): AnonymousResourceCollection
    {
        $requests = request()->user()
            ->bloodRequests()
            ->with('creator')
            ->withCount('responses')
            ->orderByDesc('id')
            ->get();

        return BloodRequestResource::collection($requests);
    }

    /**
     * Offer a response to an active blood request.
     */
    public function storeResponse(
        StoreBloodRequestResponseRequest $request,
        BloodRequest $bloodRequest,
    ): JsonResponse {
        if (! $bloodRequest->isOpen()) {
            return response()->json([
                'message' => 'This blood request is no longer accepting responses.',
            ], 409);
        }

        if ((int) $bloodRequest->created_by === (int) $request->user()->id) {
            return response()->json([
                'message' => 'You cannot respond to your own blood request.',
            ], 422);
        }

        $alreadyResponded = BloodRequestResponse::query()
            ->where('blood_request_id', $bloodRequest->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        if ($alreadyResponded) {
            return response()->json([
                'message' => 'You have already responded to this blood request.',
            ], 409);
        }

        $response = DB::transaction(function () use ($request, $bloodRequest) {
            return BloodRequestResponse::query()->create([
                'blood_request_id' => $bloodRequest->id,
                'user_id' => $request->user()->id,
                'message' => $request->validated('message'),
            ]);
        });

        return response()->json([
            'message' => 'Your response was submitted successfully.',
            'data' => new BloodRequestResponseResource($response->load('respondent')),
        ], 201);
    }

    /**
     * Update the status of a blood request (creator or authorized role only).
     */
    public function updateStatus(
        UpdateBloodRequestStatusRequest $request,
        BloodRequest $bloodRequest,
    ): JsonResponse {
        Gate::authorize('updateStatus', $bloodRequest);

        $newStatus = $request->validated('status');

        if (! $bloodRequest->isOpen()
            && in_array($newStatus, BloodRequest::OPEN_STATUSES, true)) {
            return response()->json([
                'message' => 'A closed blood request cannot be reopened.',
            ], 422);
        }

        $closing = in_array($newStatus, BloodRequest::CLOSED_STATUSES, true);

        $bloodRequest->update([
            'status' => $newStatus,
            'closed_at' => $closing ? ($bloodRequest->closed_at ?? now()) : null,
        ]);

        return response()->json([
            'message' => 'Blood request status updated successfully.',
            'data' => new BloodRequestResource($bloodRequest->refresh()->load('creator')),
        ]);
    }

    private function canViewClosed(BloodRequest $bloodRequest): bool
    {
        $user = request()->user();

        if ($user === null) {
            return false;
        }

        return (int) $bloodRequest->created_by === (int) $user->id
            || $user->isSuperAdmin();
    }
}
