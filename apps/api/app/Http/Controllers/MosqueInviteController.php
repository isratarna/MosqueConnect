<?php

namespace App\Http\Controllers;

use App\Http\Resources\MosqueMemberResource;
use App\Models\MosqueMember;
use App\Services\MosqueTeamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The signed-in user's pending invitations to join mosque teams.
 */
class MosqueInviteController extends Controller
{
    public function __construct(private readonly MosqueTeamService $team) {}

    public function index(Request $request): JsonResponse
    {
        $invites = $request->user()->mosqueMemberships()
            ->pending()
            ->with(['mosque:id,name,address,photo_path', 'inviter:id,name'])
            ->latest('id')
            ->get();

        return response()->json([
            'data' => MosqueMemberResource::collection($invites)->resolve(),
        ]);
    }

    public function accept(Request $request, MosqueMember $invite): JsonResponse
    {
        $this->assertOwnPendingInvite($request, $invite);

        $member = $this->team->accept($invite);

        return response()->json([
            'message' => "You have joined {$invite->mosque->name}.",
            'data' => (new MosqueMemberResource($member->load(['mosque', 'inviter:id,name'])))->resolve(),
        ]);
    }

    public function decline(Request $request, MosqueMember $invite): JsonResponse
    {
        $this->assertOwnPendingInvite($request, $invite);

        $this->team->decline($invite);

        return response()->json([
            'message' => 'Invitation declined.',
        ]);
    }

    private function assertOwnPendingInvite(Request $request, MosqueMember $invite): void
    {
        abort_unless((int) $invite->user_id === (int) $request->user()->id && ! $invite->isAccepted(), 404);
    }
}
