<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BloodRequestResponseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'blood_request_id' => $this->blood_request_id,
            'user_id' => $this->user_id,
            'message' => $this->message,
            'respondent' => $this->whenLoaded('respondent', fn (): array => [
                'id' => $this->respondent->id,
                'name' => $this->respondent->name,
                'phone' => $this->respondent->phone,
            ]),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
