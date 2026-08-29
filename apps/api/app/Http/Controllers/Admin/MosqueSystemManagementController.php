<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MosqueSystemManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'verification_status' => ['nullable', Rule::in(Mosque::VERIFICATION_STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $mosques = Mosque::query()
            ->with('owner:id,name,phone,role,account_status')
            ->withCount(['followers', 'events', 'campaigns'])
            ->when($filters['verification_status'] ?? null, fn (Builder $query, string $status) => $query->where('verification_status', $status))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(fn (Builder $query) => $query->where('name', 'like', "%{$search}%")->orWhere('address', 'like', "%{$search}%")))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20);

        return response()->json($mosques);
    }

    public function updateStatus(Request $request, Mosque $mosque): JsonResponse
    {
        $validated = $request->validate([
            'verification_status' => ['required', Rule::in(Mosque::VERIFICATION_STATUSES)],
            'review_note' => ['nullable', 'string', 'max:5000', 'required_if:verification_status,rejected'],
        ]);

        $before = $mosque->verification_status;
        $mosque->update(['verification_status' => $validated['verification_status']]);

        if ($mosque->owner && $mosque->verification_status === Mosque::VERIFICATION_VERIFIED) {
            $mosque->owner->update(['role' => User::ROLE_MOSQUE_ADMIN]);
        }

        AdminAuditLog::record($request->user(), 'mosque.verification_updated', $mosque, [
            'before' => $before,
            'after' => $mosque->verification_status,
            'review_note' => $validated['review_note'] ?? null,
        ]);

        return response()->json([
            'message' => 'Mosque verification status updated.',
            'data' => $mosque->fresh()->load('owner:id,name,phone,role,account_status'),
        ]);
    }
}
