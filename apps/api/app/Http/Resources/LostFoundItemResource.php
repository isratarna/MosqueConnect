<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LostFoundItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user('sanctum');

        return [
            'id' => $this->id,
            'mosque_id' => $this->mosque_id,
            'type' => $this->type,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'occurred_on' => $this->occurred_on?->toDateString(),
            'location_note' => $this->location_note,
            'photo_url' => $this->photo_url,
            'contact_phone' => $this->contact_phone,
            'status' => $this->status,
            'moderation_status' => $this->moderation_status,
            'is_owner' => $user !== null && (int) $user->id === (int) $this->user_id,
            'mosque' => $this->whenLoaded('mosque', fn (): ?array => $this->mosque ? [
                'id' => $this->mosque->id,
                'name' => $this->mosque->name,
                'area' => $this->mosque->area,
            ] : null),
            'poster' => $this->whenLoaded('user', fn (): ?array => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ] : null),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
