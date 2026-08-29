<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VolunteerApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'volunteer_opportunity_id' => $this->volunteer_opportunity_id,
            'user_id' => $this->user_id,
            'message' => $this->message,
            'status' => $this->status,
            'review_note' => $this->review_note,
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at?->toJSON(),
            'opportunity' => $this->whenLoaded('opportunity', function (): array {
                return [
                    'id' => $this->opportunity->id,
                    'title' => $this->opportunity->title,
                    'status' => $this->opportunity->status,
                    'mosque' => $this->whenLoaded('opportunity.mosque', function (): array {
                        return [
                            'id' => $this->opportunity->mosque->id,
                            'name' => $this->opportunity->mosque->name,
                        ];
                    }),
                ];
            }),
            'user' => $this->whenLoaded('user', fn (): array => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ]),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
