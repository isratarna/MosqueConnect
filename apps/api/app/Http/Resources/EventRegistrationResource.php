<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventRegistrationResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $isAdmin = in_array($request->user()?->role, [User::ROLE_MOSQUE_ADMIN, User::ROLE_SUPER_ADMIN], true);

        return [
            'id' => $this->id,
            'event_id' => $this->event_id,
            'user_id' => $this->user_id,
            'name' => $this->when($isAdmin, $this->user?->name),
            'phone' => $this->when($isAdmin, $this->user?->phone),
            'status' => $this->status,
            'occurrence_date' => $this->occurrence_date?->format('Y-m-d'),
            'ticket_code' => $this->ticket_code,
            'checked_in_at' => $this->checked_in_at?->toJSON(),
            'registered_at' => $this->created_at?->toJSON(),
        ];
    }
}
