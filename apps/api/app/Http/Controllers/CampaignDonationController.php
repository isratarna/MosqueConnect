<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCampaignDonationRequest;
use App\Http\Resources\CampaignDonationResource;
use App\Models\Campaign;
use App\Models\CampaignDonation;
use Illuminate\Http\JsonResponse;

class CampaignDonationController extends Controller
{
    public function store(StoreCampaignDonationRequest $request, Campaign $campaign): JsonResponse
    {
        $donation = $campaign->donations()->create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'status' => CampaignDonation::STATUS_PENDING,
        ]);

        return (new CampaignDonationResource($donation))
            ->additional(['message' => 'Your manual donation was submitted for mosque confirmation.'])
            ->response()
            ->setStatusCode(201);
    }
}
