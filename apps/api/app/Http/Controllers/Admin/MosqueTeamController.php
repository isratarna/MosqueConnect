<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\MosqueMemberResource;
use App\Models\Mosque;
use App\Models\MosqueMember;
use App\Services\MosqueTeamService;
use App\Support\MosqueAbility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * A mosque's team, as seen from its dashboard.
 */
class MosqueTeamController extends Controller
{
    public function __construct(private readonly MosqueTeamService $team) {}

    public function index(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('view', $mosque);

        $members = $mosque->members()
            ->with(['user:id,name,phone', 'inviter:id,name'])
            ->orderByRaw('CASE WHEN accepted_at IS NULL THEN 1 ELSE 0 END')
            ->orderByRaw("CASE role WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 WHEN 'editor' THEN 3 ELSE 4 END")
            ->orderBy('id')
            ->get();

        $user = $request->user();
        $role = MosqueAbility::roleOf($user, $mosque);

        return response()->json([
            'data' => MosqueMemberResource::collection($members)->resolve(),
            'role' => $role,
            'abilities' => $user->isSuperAdmin() ? MosqueAbility::ABILITIES : MosqueAbility::forRole($role),
            'roles' => collect(MosqueMember::ROLE_LABELS)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ]);
    }

    public function store(Request $request, Mosque $mosque): JsonResponse
    {
        Gate::authorize('manageTeam', $mosque);

        $validated = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+[1-9]\d{7,14}$/'],
            'role' => ['required', Rule::in(MosqueMember::ROLES)],
        ], [
            'phone.regex' => 'Enter the phone number with its country code, for example +8801712345678.',
        ]);

        // Managers can grow the team, but only an owner can make another owner.
        if ($validated['role'] === MosqueMember::ROLE_OWNER) {
            Gate::authorize('manageMembers', $mosque);
        }

        $member = $this->team->invite($mosque, $request->user(), $validated['phone'], $validated['role']);

        return response()->json([
            'message' => $member->user_id
                ? 'Invitation sent.'
                : 'Invitation saved. It will be waiting for them when they sign up with this number.',
            'data' => (new MosqueMemberResource($member->load(['user:id,name,phone', 'inviter:id,name'])))->resolve(),
        ], 201);
    }

    public function update(Request $request, Mosque $mosque, MosqueMember $member): JsonResponse
    {
        Gate::authorize('manageMembers', $mosque);

        $validated = $request->validate([
            'role' => ['required', Rule::in(MosqueMember::ROLES)],
        ]);

        $member = $this->team->changeRole($member, $validated['role']);

        return response()->json([
            'message' => 'Role updated.',
            'data' => (new MosqueMemberResource($member->load(['user:id,name,phone', 'inviter:id,name'])))->resolve(),
        ]);
    }

    public function destroy(Mosque $mosque, MosqueMember $member): JsonResponse
    {
        // Cancelling an invitation is part of inviting; removing a member is owner-only.
        Gate::authorize($member->isAccepted() ? 'manageMembers' : 'manageTeam', $mosque);

        $this->team->remove($member);

        return response()->json([
            'message' => $member->isAccepted() ? 'Member removed.' : 'Invitation cancelled.',
        ]);
    }

    public function leave(Request $request, Mosque $mosque): JsonResponse
    {
        $member = $mosque->members()
            ->where('user_id', $request->user()->id)
            ->accepted()
            ->firstOrFail();

        $this->team->remove($member);

        return response()->json([
            'message' => "You have left {$mosque->name}.",
        ]);
    }
}
