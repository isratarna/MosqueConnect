<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $target = (float) $this->target_amount;
        $raised = (float) $this->raised_amount;

        return [
            'id' => $this->id,
            'mosque_id' => $this->mosque_id,
            'created_by' => $this->created_by,
            'title' => $this->title,
            'summary' => $this->summary,
            'description' => $this->description,
            'category' => $this->category,
            'target_amount' => $target,
            'raised_amount' => $raised,
            'remaining_amount' => max(0, round($target - $raised, 2)),
            'progress_percentage' => $target > 0 ? round(min(100, ($raised / $target) * 100), 2) : 0,
            'currency' => $this->currency,
            'starts_on' => $this->starts_on?->format('Y-m-d'),
            'ends_on' => $this->ends_on?->format('Y-m-d'),
            'image_url' => $this->image_url,
            'reference_hint' => $this->reference_hint,
            'status' => $this->status,
            'accepts_donations' => $this->acceptsDonations(),
            'notice' => match ($this->status) {
                \App\Models\Campaign::STATUS_COMPLETED => 'This campaign is complete.',
                \App\Models\Campaign::STATUS_CANCELLED => 'This campaign has been cancelled.',
                \App\Models\Campaign::STATUS_EXPIRED => 'This campaign has expired.',
                default => null,
            },
            'supporters_count' => $this->whenCounted('supporters'),
            'pending_donations_count' => $this->whenCounted('pendingDonations'),
            'mosque' => $this->whenLoaded('mosque', fn (): array => [
                'id' => $this->mosque->id,
                'name' => $this->mosque->name,
                'address' => $this->mosque->address,
                'phone' => $this->mosque->phone,
                'verification_status' => $this->mosque->verification_status,
            ]),
            'creator' => $this->whenLoaded('creator', fn (): array => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'payment_methods' => $this->when(
                $this->relationLoaded('mosque') && $this->mosque->relationLoaded('paymentMethods'),
                fn (): array => MosquePaymentMethodResource::collection($this->mosque->paymentMethods)->resolve(),
            ),
            'updates' => $this->whenLoaded('updates', fn (): array => CampaignUpdateResource::collection($this->updates)->resolve()),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
