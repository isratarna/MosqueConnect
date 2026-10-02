<?php

namespace App\Http\Resources;

use App\Models\MosqueMember;
use App\Support\MosqueAbility;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property MosqueMember $resource
 */
class MosqueMemberResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $member = $this->resource;

        return [
            'id' => $member->id,
            'mosque_id' => $member->mosque_id,
            'role' => $member->role,
            'role_label' => MosqueMember::ROLE_LABELS[$member->role] ?? $member->role,
            'abilities' => MosqueAbility::forRole($member->role),
            'status' => $member->isAccepted() ? 'active' : 'pending',
            'accepted_at' => $member->accepted_at?->toJSON(),
            'invited_at' => $member->created_at?->toJSON(),
            'phone' => $member->user?->phone ?? $member->phone,
            'has_account' => $member->user_id !== null,
            'user' => $this->whenLoaded('user', fn (): ?array => $member->user ? [
                'id' => $member->user->id,
                'name' => $member->user->name,
                'phone' => $member->user->phone,
            ] : null),
            'invited_by' => $this->whenLoaded('inviter', fn (): ?array => $member->inviter ? [
                'id' => $member->inviter->id,
                'name' => $member->inviter->name,
            ] : null),
            'mosque' => $this->whenLoaded('mosque', fn (): array => [
                'id' => $member->mosque->id,
                'name' => $member->mosque->name,
                'address' => $member->mosque->address,
                'photo_url' => $member->mosque->photo_url,
            ]),
        ];
    }
}
