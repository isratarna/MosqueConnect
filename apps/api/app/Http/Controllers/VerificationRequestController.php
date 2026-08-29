<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVerificationRequest;
use App\Http\Resources\VerificationRequestResource;
use App\Models\VerificationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class VerificationRequestController extends Controller
{
    public function store(StoreVerificationRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($request->hasActiveConflict()) {
            return response()->json([
                'message' => 'A verification request is already in progress for this user or mosque.',
            ], 409);
        }

        $path = $request->file('proof_document')->storeAs(
            'verification/'.$user->id,
            $request->file('proof_document')->getClientOriginalName(),
            ['disk' => 'local', 'visibility' => 'private'],
        );

        $verificationRequest = VerificationRequest::query()->create([
            'user_id' => $user->id,
            'mosque_id' => $request->integer('mosque_id'),
            'document_path' => $path,
            'status' => VerificationRequest::STATUS_PENDING,
            'submitted_at' => now(),
        ]);

        $verificationRequest->load('mosque');

        return response()->json([
            'message' => 'Verification request submitted successfully.',
            'data' => new VerificationRequestResource($verificationRequest),
        ], 201);
    }

    public function me(Request $request): AnonymousResourceCollection
    {
        $requests = $request->user()
            ->verificationRequests()
            ->with('mosque')
            ->orderByDesc('submitted_at')
            ->get();

        return VerificationRequestResource::collection($requests);
    }

    public function show(Request $request, VerificationRequest $verificationRequest): VerificationRequestResource
    {
        abort_unless(
            (int) $verificationRequest->user_id === (int) $request->user()->id,
            403,
            'Forbidden.',
        );

        $verificationRequest->load('mosque');

        return new VerificationRequestResource($verificationRequest);
    }
}
