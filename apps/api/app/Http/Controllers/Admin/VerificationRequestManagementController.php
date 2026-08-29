<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Mosque;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class VerificationRequestManagementController extends Controller
{
    private const STATUSES = ['pending', 'ai_reviewed', 'under_human_review', 'approved', 'rejected'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $requests = VerificationRequest::query()
            ->with([
                'user:id,name,phone,role,account_status',
                'mosque:id,owner_id,name,address,verification_status',
                'reviewer:id,name',
            ])
            ->withCount('applicantClaims')
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->whereHas('user', fn (Builder $query) => $query->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"))
                        ->orWhereHas('mosque', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderByRaw("CASE WHEN status IN ('pending', 'ai_reviewed', 'under_human_review') THEN 0 ELSE 1 END")
            ->orderByDesc('submitted_at')
            ->paginate($filters['per_page'] ?? 20);

        return response()->json($requests);
    }

    public function show(VerificationRequest $verificationRequest): JsonResponse
    {
        return response()->json([
            'data' => $verificationRequest->load(['user', 'mosque', 'reviewer', 'applicantClaims.mosque:id,name']),
        ]);
    }

    public function document(VerificationRequest $verificationRequest)
    {
        abort_unless(Storage::disk('local')->exists($verificationRequest->document_path), 404, 'Verification document was not found.');

        return Storage::disk('local')->download($verificationRequest->document_path);
    }

    public function approve(Request $request, VerificationRequest $verificationRequest): JsonResponse
    {
        $validated = $request->validate([
            'review_note' => ['nullable', 'string', 'max:5000'],
        ]);

        $updated = DB::transaction(function () use ($request, $verificationRequest, $validated): VerificationRequest {
            $claim = VerificationRequest::query()->lockForUpdate()->findOrFail($verificationRequest->id);
            abort_if(in_array($claim->status, ['approved', 'rejected'], true), 422, 'This claim has already been finalized.');

            $claim->update([
                'status' => 'approved',
                'reviewer_id' => $request->user()->id,
                'review_note' => $validated['review_note'] ?? null,
                'reviewed_at' => now(),
            ]);
            $claim->mosque()->update([
                'owner_id' => $claim->user_id,
                'verification_status' => Mosque::VERIFICATION_VERIFIED,
            ]);
            $claim->user()->update(['role' => User::ROLE_MOSQUE_ADMIN]);

            AdminAuditLog::record($request->user(), 'claim.approved', $claim, [
                'mosque_id' => $claim->mosque_id,
                'applicant_id' => $claim->user_id,
                'review_note' => $validated['review_note'] ?? null,
            ]);

            return $claim;
        });

        return response()->json([
            'message' => 'Mosque claim approved successfully.',
            'data' => $updated->load(['user', 'mosque', 'reviewer']),
        ]);
    }

    public function reject(Request $request, VerificationRequest $verificationRequest): JsonResponse
    {
        $validated = $request->validate([
            'review_note' => ['required', 'string', 'max:5000'],
        ]);

        $updated = DB::transaction(function () use ($request, $verificationRequest, $validated): VerificationRequest {
            $claim = VerificationRequest::query()->lockForUpdate()->findOrFail($verificationRequest->id);
            abort_if(in_array($claim->status, ['approved', 'rejected'], true), 422, 'This claim has already been finalized.');

            $claim->update([
                'status' => 'rejected',
                'reviewer_id' => $request->user()->id,
                'review_note' => $validated['review_note'],
                'reviewed_at' => now(),
            ]);
            $claim->mosque()->update(['verification_status' => Mosque::VERIFICATION_REJECTED]);

            AdminAuditLog::record($request->user(), 'claim.rejected', $claim, [
                'mosque_id' => $claim->mosque_id,
                'applicant_id' => $claim->user_id,
                'review_note' => $validated['review_note'],
            ]);

            return $claim;
        });

        return response()->json([
            'message' => 'Mosque claim rejected.',
            'data' => $updated->load(['user', 'mosque', 'reviewer']),
        ]);
    }

    public function requestInformation(Request $request, VerificationRequest $verificationRequest): JsonResponse
    {
        $validated = $request->validate([
            'review_note' => ['required', 'string', 'max:5000'],
        ]);

        abort_if(in_array($verificationRequest->status, ['approved', 'rejected'], true), 422, 'This claim has already been finalized.');

        $verificationRequest->update([
            'status' => 'under_human_review',
            'reviewer_id' => $request->user()->id,
            'review_note' => $validated['review_note'],
            'reviewed_at' => null,
        ]);

        AdminAuditLog::record($request->user(), 'claim.information_requested', $verificationRequest, [
            'review_note' => $validated['review_note'],
        ]);

        return response()->json([
            'message' => 'More information has been requested.',
            'data' => $verificationRequest->load(['user', 'mosque', 'reviewer']),
        ]);
    }
}
