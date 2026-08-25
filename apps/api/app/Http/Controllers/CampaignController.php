<?php

namespace App\Http\Controllers;

use App\Http\Requests\CampaignIndexRequest;
use App\Http\Resources\CampaignResource;
use App\Models\Campaign;
use App\Models\CampaignDonation;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CampaignController extends Controller
{
    public function index(CampaignIndexRequest $request): AnonymousResourceCollection
    {
        $filters = $request->safe()->except('status');
        $campaigns = Campaign::query()
            ->publiclyActive()
            ->with(['mosque', 'creator'])
            ->withCount(['donations as supporters_count' => fn ($query) => $query->where('status', CampaignDonation::STATUS_CONFIRMED)])
            ->filter($filters)
            ->orderBy('ends_on')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 12))
            ->withQueryString();

        return CampaignResource::collection($campaigns);
    }

    public function show(Campaign $campaign): CampaignResource
    {
        abort_unless($campaign->acceptsDonations(), 404);

        $campaign->load(['mosque', 'creator'])->loadCount([
            'donations as supporters_count' => fn ($query) => $query->where('status', CampaignDonation::STATUS_CONFIRMED),
        ]);

        return new CampaignResource($campaign);
    }
}
