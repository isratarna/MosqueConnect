<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ComplaintResource extends JsonResource
{
    /**
     * An anonymous complaint hides the author from the mosque's admins.
     * The author and the super admin still see who sent it.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $showAuthor = ! $this->is_anonymous
            || ($viewer && ($viewer->isSuperAdmin() || (int) $viewer->id === (int) $this->user_id));

        return [
            'id' => $this->id,
            'mosque_id' => $this->mosque_id,
            'category' => $this->category,
            'subject' => $this->subject,
            'body' => $this->body,
            'is_anonymous' => $this->is_anonymous,
            'status' => $this->status,
            'admin_response' => $this->admin_response,
            'responded_at' => $this->responded_at?->toJSON(),
            'author' => $showAuthor && $this->relationLoaded('user') && $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ] : null,
            'mosque' => $this->whenLoaded('mosque', fn (): array => [
                'id' => $this->mosque->id,
                'name' => $this->mosque->name,
            ]),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
