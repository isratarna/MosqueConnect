<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CampaignUpdateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campaign_id' => $this->campaign_id,
            'title' => $this->title,
            'body' => $this->body,
            'amount_spent' => $this->amount_spent === null ? null : (float) $this->amount_spent,
            'image_url' => $this->image_path ? Storage::disk('public')->url($this->image_path) : null,
            'posted_by' => $this->whenLoaded('poster', fn (): ?array => $this->poster === null ? null : [
                'id' => $this->poster->id,
                'name' => $this->poster->name,
            ]),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}