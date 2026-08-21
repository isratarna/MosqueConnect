<?php

namespace App\Http\Resources;

use App\Models\Mosque;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mosque_id' => $this->mosque_id,
            'title' => $this->title,
            'body' => $this->body,
            'urgency' => $this->urgency,
            'status' => $this->status,
            'published_at' => $this->published_at?->toJSON(),
            'date' => $this->published_at?->toDateString(),
            'mosque' => $this->whenLoaded('mosque', fn (): array => [
                'id' => $this->mosque->id,
                'name' => $this->mosque->name,
                'address' => $this->mosque->address,
                'phone' => $this->mosque->phone,
                'verification_status' => $this->mosque->verification_status,
                'verified' => $this->mosque->verification_status === Mosque::VERIFICATION_VERIFIED,
            ]),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
