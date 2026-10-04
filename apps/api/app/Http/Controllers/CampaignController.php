<?php

namespace App\Http\Controllers;

use App\Http\Requests\CampaignIndexRequest;
use App\Http\Resources\CampaignResource;
use App\Http\Resources\CampaignSupporterResource;
use App\Http\Resources\CampaignUpdateResource;
use App\Models\Campaign;
use App\Models\CampaignDonation;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    public function index(CampaignIndexRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $sort = $filters['sort'] ?? 'ending_soon';
        unset($filters['sort']);

        $query = Campaign::query()
            ->where('moderation_status', Campaign::MODERATION_APPROVED)
            ->whereIn('status', [
                Campaign::STATUS_ACTIVE,
                Campaign::STATUS_COMPLETED,
                Campaign::STATUS_CANCELLED,
                Campaign::STATUS_EXPIRED,
            ]);

        if (! isset($filters['status']) || $filters['status'] === Campaign::STATUS_ACTIVE) {
            $query->publiclyActive();
        }

        $campaigns = $query
            ->with(['mosque', 'creator'])
            ->withCount(['donations as supporters_count' => fn ($query) => $query->where('status', CampaignDonation::STATUS_CONFIRMED)])
            ->filter($filters)
            ->when($sort === 'ending_soon', fn ($query) => $query->orderBy('ends_on')->orderByDesc('id'))
            ->when($sort === 'newest', fn ($query) => $query->orderByDesc('created_at')->orderByDesc('id'))
            ->when($sort === 'most_funded', fn ($query) => $query->orderByDesc('raised_amount')->orderByDesc('id'))
            ->when($sort === 'almost_there', fn ($query) => $query
                ->orderByRaw('CASE WHEN target_amount > 0 THEN raised_amount / target_amount ELSE 0 END DESC')
                ->orderByDesc('id'))
            ->paginate($request->integer('per_page', 12))
            ->withQueryString();

        return CampaignResource::collection($campaigns);
    }

    public function show(Campaign $campaign): CampaignResource
    {
        $this->authorizePublicCampaign($campaign);

        $campaign->load([
            'mosque.paymentMethods' => fn ($query) => $query->where('is_active', true)->orderBy('sort_order')->orderBy('id'),
            'creator',
            'updates' => fn ($query) => $query->with('poster')->latest('created_at')->latest('id')->limit(5),
        ])->loadCount([
            'donations as supporters_count' => fn ($query) => $query->where('status', CampaignDonation::STATUS_CONFIRMED),
        ]);

        return new CampaignResource($campaign);
    }

    public function supporters(Request $request, Campaign $campaign): AnonymousResourceCollection
    {
        $this->authorizePublicCampaign($campaign);
        $validated = $request->validate(['per_page' => ['sometimes', 'integer', 'between:1,50']]);
        $supporters = $campaign->donations()
            ->where('status', CampaignDonation::STATUS_CONFIRMED)
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return CampaignSupporterResource::collection($supporters);
    }

    public function updates(Request $request, Campaign $campaign): AnonymousResourceCollection
    {
        $this->authorizePublicCampaign($campaign);
        $validated = $request->validate(['per_page' => ['sometimes', 'integer', 'between:1,50']]);
        $updates = $campaign->updates()
            ->with('poster:id,name')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return CampaignUpdateResource::collection($updates);
    }

    private function authorizePublicCampaign(Campaign $campaign): void
    {
        abort_unless(
            $campaign->moderation_status === Campaign::MODERATION_APPROVED
                && in_array($campaign->status, [
                    Campaign::STATUS_ACTIVE,
                    Campaign::STATUS_COMPLETED,
                    Campaign::STATUS_CANCELLED,
                    Campaign::STATUS_EXPIRED,
                ], true),
            404,
        );
    }
}
