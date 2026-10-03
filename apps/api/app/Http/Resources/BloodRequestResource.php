<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

class BloodRequestResource extends JsonResource
{
    /**
     * @param  bool  $canViewResponses  Whether the viewer may see who offered to
     *                                  help, which means their phone numbers.
     */
    public function __construct($resource, private readonly bool $canViewResponses = false)
    {
        parent::__construct($resource);
    }

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
            'closed_reason' => $this->closed_reason,
            // The creator's account phone number is never published; the
            // requester shares contact_phone on purpose instead.
            'creator' => $this->whenLoaded('creator', fn (): array => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'responses_count' => $this->when(isset($this->responses_count), fn (): int => (int) $this->responses_count),
            'has_responded' => (bool) ($this->resource->has_responded ?? false),
            'responses' => $this->when(
                $this->canViewResponses && $this->relationLoaded('responses'),
                fn (): AnonymousResourceCollection => BloodRequestResponseResource::collection($this->responses),
            ),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}