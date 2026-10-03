<?php

namespace App\Http\Controllers;

use App\Models\Follower;
use App\Models\Mosque;
use App\Models\MosqueDailyStat;
use App\Models\NotificationPreference;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MosqueFollowController extends Controller
{
    public function follow(Request $request, Mosque $mosque): JsonResponse
    {
        try {
            $follower = Follower::create([
                'user_id' => $request->user()->id,
                'mosque_id' => $mosque->id,
            ]);
        } catch (QueryException $exception) {
            if ($this->alreadyFollowing($request, $mosque)) {
                return response()->json([
                    'message' => 'Already following this mosque.',
                ], 409);
            }

            throw $exception;
        }

        MosqueDailyStat::record($mosque->id, 'follows');

        return response()->json([
            'message' => 'Mosque followed successfully.',
            'data' => $follower,
        ], 201);
    }

    public function unfollow(Request $request, Mosque $mosque): JsonResponse
    {
        $deleted = Follower::query()
            ->where('user_id', $request->user()->id)
            ->where('mosque_id', $mosque->id)
            ->delete();

        if ($deleted === 0) {
            return response()->json([
                'message' => 'You are not following this mosque.',
            ], 404);
        }

        MosqueDailyStat::record($mosque->id, 'unfollows');

        return response()->json([
            'message' => 'Mosque unfollowed successfully.',
        ]);
    }

    public function muteNotifications(Request $request, Mosque $mosque): JsonResponse
    {
        $validated = $request->validate(['notifications_muted' => ['required', 'boolean']]);
        $follower = Follower::query()
            ->where('user_id', $request->user()->id)
            ->where('mosque_id', $mosque->id)
            ->firstOrFail();
        $follower->notifications_muted = $validated['notifications_muted'];
        $follower->save();

        return response()->json([
            'message' => $follower->notifications_muted ? 'Mosque notifications muted.' : 'Mosque notifications unmuted.',
            'notifications_muted' => $follower->notifications_muted,
        ]);
    }

    public function followed(Request $request): JsonResponse
    {
        $mosques = $request->user()
            ->followedMosques()
            ->orderBy('mosques.name')
            ->get()
            ->map(function (Mosque $mosque): Mosque {
                $mosque->setAttribute('notifications_muted', (bool) $mosque->pivot->notifications_muted);

                return $mosque;
            });

        return response()->json([
            'data' => $mosques,
        ]);
    }

    private function alreadyFollowing(Request $request, Mosque $mosque): bool
    {
        return Follower::query()
            ->where('user_id', $request->user()->id)
            ->where('mosque_id', $mosque->id)
            ->exists();
    }
}
