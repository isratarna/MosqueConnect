<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mosque_id' => $this->mosque_id,
            'created_by' => $this->created_by,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'event_date' => $this->event_date?->format('Y-m-d'),
            'start_time' => $this->formatTime($this->start_time),
            'end_time' => $this->formatTime($this->end_time),
            'location' => $this->location,
            'capacity' => $this->capacity,
            'registration_required' => $this->registration_required,
            'status' => $this->status,
            'mosque' => $this->whenLoaded('mosque', fn (): array => [
                'id' => $this->mosque->id,
                'name' => $this->mosque->name,
                'address' => $this->mosque->address,
                'latitude' => (float) $this->mosque->latitude,
                'longitude' => (float) $this->mosque->longitude,
                'phone' => $this->mosque->phone,
                'verification_status' => $this->mosque->verification_status,
            ]),
            'creator' => $this->whenLoaded('creator', fn (): array => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }

    private function formatTime(?string $time): ?string
    {
        return $time === null ? null : substr($time, 0, 5);
    }
}
