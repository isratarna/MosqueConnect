<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'role' => ['nullable', Rule::in(User::ROLES)],
            'account_status' => ['nullable', Rule::in(User::ACCOUNT_STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $users = User::query()
            ->withCount(['ownedMosques', 'followedMosques'])
            ->when($filters['role'] ?? null, fn (Builder $query, string $role) => $query->where('role', $role))
            ->when($filters['account_status'] ?? null, fn (Builder $query, string $status) => $query->where('account_status', $status))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(fn (Builder $query) => $query->where('name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%")))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 20);

        return response()->json($users);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', Rule::in(User::ROLES)],
            'account_status' => ['sometimes', Rule::in(User::ACCOUNT_STATUSES)],
            'suspension_reason' => ['nullable', 'string', 'max:2000', 'required_if:account_status,suspended'],
        ]);

        abort_if($request->user()->is($user) && (($validated['role'] ?? $user->role) !== User::ROLE_SUPER_ADMIN), 422, 'You cannot remove your own super-admin role.');
        abort_if($request->user()->is($user) && (($validated['account_status'] ?? $user->account_status) === User::STATUS_SUSPENDED), 422, 'You cannot suspend your own account.');

        $before = $user->only(['name', 'role', 'account_status', 'suspension_reason']);
        $newStatus = $validated['account_status'] ?? $user->account_status;
        $validated['suspended_at'] = $newStatus === User::STATUS_SUSPENDED ? ($user->suspended_at ?? now()) : null;
        $validated['suspension_reason'] = $newStatus === User::STATUS_SUSPENDED ? ($validated['suspension_reason'] ?? $user->suspension_reason) : null;

        $user->update($validated);

        if ($user->isSuspended()) {
            $user->tokens()->delete();
        }

        AdminAuditLog::record($request->user(), 'user.updated', $user, [
            'before' => $before,
            'after' => $user->only(['name', 'role', 'account_status', 'suspension_reason']),
        ]);

        return response()->json([
            'message' => 'User account updated successfully.',
            'data' => $user->fresh()->loadCount(['ownedMosques', 'followedMosques']),
        ]);
    }
}
