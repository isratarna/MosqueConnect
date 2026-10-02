<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VolunteerApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $isAdminResponse = $this->relationLoaded('user') && in_array($request->user()?->role, [User::ROLE_MOSQUE_ADMIN, User::ROLE_SUPER_ADMIN], true);

        return [
            'id' => $this->id,
            'volunteer_opportunity_id' => $this->volunteer_opportunity_id,
            'user_id' => $this->user_id,
            'status' => $this->status,
            'applied_at' => $this->created_at?->toJSON(),
            'reviewed_at' => $this->reviewed_at?->toJSON(),
            'cancelled_at' => $this->cancelled_at?->toJSON(),
            'opportunity' => $this->whenLoaded('opportunity', fn () => new VolunteerOpportunityResource($this->opportunity)),
            'user' => $this->when($isAdminResponse, fn () => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'phone' => $this->user?->phone,
            ]),
            'reviewer' => $this->whenLoaded('reviewer', fn () => [
                'id' => $this->reviewer?->id,
                'name' => $this->reviewer?->name,
            ]),
        ];
    }
}
