<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignDonationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campaign_id' => $this->campaign_id,
            'campaign' => $this->whenLoaded('campaign', fn () => [
                'id' => $this->campaign?->id,
                'title' => $this->campaign?->title,
                'currency' => $this->campaign?->currency,
                'mosque_name' => $this->campaign?->mosque?->name,
            ]),
            'user_id' => $this->user_id,
            'donor_name' => $this->donor_name,
            'contact' => $this->contact,
            'amount' => (float) $this->amount,
            'payment_method' => $this->payment_method,
            'reference' => $this->reference,
            'message' => $this->message,
            'is_anonymous' => $this->is_anonymous,
            'status' => $this->status,
            'confirmed_by' => $this->confirmed_by,
            'confirmed_at' => $this->confirmed_at?->toJSON(),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
