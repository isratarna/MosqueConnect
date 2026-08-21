<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'mosque_id' => $this->mosque_id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'is_read' => $this->is_read,
            'mosque' => $this->whenLoaded('mosque', fn (): array => [
                'id' => $this->mosque->id,
                'name' => $this->mosque->name,
            ]),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
