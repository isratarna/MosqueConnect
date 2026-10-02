<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\MosqueMemberResource;
use App\Models\AdminAuditLog;
use App\Models\Mosque;
use App\Models\User;
use App\Services\MosqueTeamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Super-admin tools for a mosque's team: transfer ownership and revoke access.
 * Both are recorded in the audit log.
 */
class SuperAdminMosqueTeamController extends Controller
{
    public function __construct(private readonly MosqueTeamService $team) {}

    public function index(Mosque $mosque): JsonResponse
    {
        $members = $mosque->members()
            ->with(['user:id,name,phone', 'inviter:id,name'])
            ->orderByRaw('CASE WHEN accepted_at IS NULL THEN 1 ELSE 0 END')
            ->orderByRaw("CASE role WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 WHEN 'editor' THEN 3 ELSE 4 END")
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => MosqueMemberResource::collection($members)->resolve(),
        ]);
    }

    public function transfer(Request $request, Mosque $mosque): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'previous_owners' => ['sometimes', Rule::in(['manager', 'remove'])],
        ]);

        $newOwner = User::query()->findOrFail($validated['user_id']);
        abort_if($newOwner->isSuperAdmin(), 422, 'A super admin can already manage every mosque. Choose a regular account.');

        $this->team->transferOwnership($mosque, $newOwner, $validated['previous_owners'] ?? 'manager', $request->user());

        return response()->json([
            'message' => "{$newOwner->name} now owns {$mosque->name}.",
            'data' => $mosque->fresh()->load('owner:id,name,phone,role,account_status'),
        ]);
    }

    public function revoke(Request $request, Mosque $mosque, User $user): JsonResponse
    {
        $member = $mosque->members()->where('user_id', $user->id)->firstOrFail();

        $this->team->remove($member, allowLastOwner: true);

        AdminAuditLog::record($request->user(), 'mosque.member_revoked', $mosque, [
            'user_id' => $user->id,
            'role' => $member->role,
            'was_pending' => ! $member->isAccepted(),
        ]);

        return response()->json([
            'message' => "{$user->name} no longer has access to {$mosque->name}.",
        ]);
    }
}
