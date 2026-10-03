<?php

namespace App\Http\Controllers;

use App\Http\Requests\FeedIndexRequest;
use App\Http\Resources\FeedItemResource;
use App\Services\FeedService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FeedController extends Controller
{
    /**
     * Updates from every mosque the signed-in user follows, newest first.
     */
    public function index(FeedIndexRequest $request, FeedService $feed): AnonymousResourceCollection
    {
        $items = $feed->forUser(
            $request->user(),
            $request->integer('per_page', FeedService::DEFAULT_PER_PAGE),
            $request->string('cursor')->toString() ?: null,
        );

        return FeedItemResource::collection($items);
    }
}
