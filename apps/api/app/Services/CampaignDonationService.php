<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CampaignDonationService
{
    /** @param array<string, mixed> $data */
    public function recordManual(Campaign $campaign, User $admin, array $data): CampaignDonation
    {
        return DB::transaction(function () use ($campaign, $admin, $data): CampaignDonation {
            $lockedCampaign = Campaign::query()->lockForUpdate()->findOrFail($campaign->id);
            $donation = $lockedCampaign->donations()->create([
                ...$data,
                'confirmed_by' => $admin->id,
                'status' => CampaignDonation::STATUS_CONFIRMED,
                'confirmed_at' => now(),
            ]);
            $lockedCampaign->increment('raised_amount', $donation->amount);

            return $donation->refresh();
        });
    }

    public function confirm(CampaignDonation $donation, User $admin): CampaignDonation
    {
        return DB::transaction(function () use ($donation, $admin): CampaignDonation {
            $lockedDonation = CampaignDonation::query()->lockForUpdate()->findOrFail($donation->id);

            if ($lockedDonation->status === CampaignDonation::STATUS_CONFIRMED) {
                return $lockedDonation;
            }
            if ($lockedDonation->status !== CampaignDonation::STATUS_PENDING) {
                throw ValidationException::withMessages(['status' => 'Only a pending donation can be confirmed.']);
            }

            $campaign = Campaign::query()->lockForUpdate()->findOrFail($lockedDonation->campaign_id);
            $lockedDonation->update([
                'status' => CampaignDonation::STATUS_CONFIRMED,
                'confirmed_by' => $admin->id,
                'confirmed_at' => now(),
            ]);
            $campaign->increment('raised_amount', $lockedDonation->amount);

            return $lockedDonation->refresh();
        });
    }

    public function reject(CampaignDonation $donation): CampaignDonation
    {
        return DB::transaction(function () use ($donation): CampaignDonation {
            $lockedDonation = CampaignDonation::query()->lockForUpdate()->findOrFail($donation->id);

            if ($lockedDonation->status !== CampaignDonation::STATUS_PENDING) {
                throw ValidationException::withMessages(['status' => 'Only a pending donation can be rejected.']);
            }

            $lockedDonation->update(['status' => CampaignDonation::STATUS_REJECTED]);

            return $lockedDonation->refresh();
        });
    }
}
