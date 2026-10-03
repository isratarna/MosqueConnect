<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MosqueSuggestionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'district' => $this->district,
            'area' => $this->area,
            'latitude' => (float) $this->latitude,
            'longitude' => (float) $this->longitude,
            'phone' => $this->phone,
            'facilities' => $this->facilities ?? [],
            'notes' => $this->notes,
            'status' => $this->status,
            'review_note' => $this->review_note,
            'mosque_id' => $this->mosque_id,
            'user' => $this->whenLoaded('user', fn (): array => ['id' => $this->user->id, 'name' => $this->user->name]),
            'reviewer' => $this->whenLoaded('reviewer', fn (): array => ['id' => $this->reviewer->id, 'name' => $this->reviewer->name]),
            'mosque' => $this->whenLoaded('mosque', fn (): array => ['id' => $this->mosque->id, 'name' => $this->mosque->name]),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
