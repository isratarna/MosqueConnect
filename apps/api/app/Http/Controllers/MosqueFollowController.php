<?php

namespace App\Http\Controllers;

use App\Models\Follower;
use App\Models\Mosque;
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

        return response()->json([
            'message' => 'Mosque unfollowed successfully.',
        ]);
    }

    public function followed(Request $request): JsonResponse
    {
        $mosques = $request->user()
            ->followedMosques()
            ->orderBy('mosques.name')
            ->get();

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
