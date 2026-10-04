<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignSupporterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->is_anonymous
                ? 'Anonymous'
                : ($this->donor_name ?: $this->user?->name ?: 'Supporter'),
            'amount' => (float) $this->amount,
            'message' => $this->message,
            'date' => $this->created_at?->toJSON(),
        ];
    }
}