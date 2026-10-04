<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCampaignDonationRequest;
use App\Http\Resources\CampaignDonationResource;
use App\Models\Campaign;
use App\Models\CampaignDonation;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class CampaignDonationController extends Controller
{
    public function index(\Illuminate\Http\Request $request): \Illuminate\Http\Resources\Json\AnonymousResourceCollection
    {
        return \App\Http\Resources\CampaignDonationResource::collection(
            $request->user()->campaignDonations()->with('campaign.mosque')->latest()->get()
        );
    }

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

    public function receipt(Request $request, CampaignDonation $donation): Response
    {
        $donation = $request->user()->campaignDonations()
            ->whereKey($donation->id)
            ->where('status', CampaignDonation::STATUS_CONFIRMED)
            ->with(['campaign.mosque', 'user', 'confirmer'])
            ->firstOrFail();

        $receiptNumber = 'MC-'.$donation->created_at->format('Y').'-'.str_pad((string) $donation->id, 8, '0', STR_PAD_LEFT);
        $donorName = $donation->is_anonymous
            ? 'Anonymous'
            : ($donation->donor_name ?: $donation->user?->name ?: 'Donor');

        return Pdf::loadView('receipts.campaign-donation', [
            'receiptNumber' => $receiptNumber,
            'donation' => $donation,
            'donorName' => $donorName,
        ])->setPaper('a4')->download("{$receiptNumber}.pdf");
    }
}
