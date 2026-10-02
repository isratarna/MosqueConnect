<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GoodsDonationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mosque_id' => $this->mosque_id,
            'announcement_id' => $this->announcement_id,
            'item_name' => $this->item_name,
            'quantity' => $this->quantity,
            'condition' => $this->condition,
            'delivery_method' => $this->delivery_method,
            'preferred_date' => $this->preferred_date?->toDateString(),
            'contact' => $this->contact,
            'notes' => $this->notes,
            'status' => $this->status,
            'handled_by' => $this->handled_by,
            'mosque' => $this->whenLoaded('mosque', fn (): array => [
                'id' => $this->mosque->id,
                'name' => $this->mosque->name,
            ]),
            'donor' => $this->whenLoaded('user', fn (): ?array => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ] : null),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
