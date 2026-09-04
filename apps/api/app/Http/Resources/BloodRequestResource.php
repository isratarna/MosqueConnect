<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BloodRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'created_by' => $this->created_by,
            'blood_group' => $this->blood_group,
            'units' => $this->units,
            'hospital_or_location' => $this->hospital_or_location,
            'required_date' => $this->required_date?->toDateString(),
            'urgency' => $this->urgency,
            'contact_name' => $this->contact_name,
            'contact_phone' => $this->contact_phone,
            'notes' => $this->notes,
            'status' => $this->status,
            'open' => $this->isOpen(),
            'closed_at' => $this->closed_at?->toJSON(),
            'creator' => $this->whenLoaded('creator', fn (): array => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'phone' => $this->creator->phone,
            ]),
            'responses_count' => $this->when(isset($this->responses_count), fn (): int => (int) $this->responses_count),
            'responses' => BloodRequestResponseResource::collection($this->whenLoaded('responses')),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
