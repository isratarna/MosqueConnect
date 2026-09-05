<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VolunteerOpportunityResource extends JsonResource
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
            'opportunity_date' => $this->opportunity_date?->toDateString(),
            'start_time' => $this->start_time ? substr($this->start_time, 0, 5) : null,
            'end_time' => $this->end_time ? substr($this->end_time, 0, 5) : null,
            'location' => $this->location,
            'volunteers_required' => $this->volunteers_required,
            'registrations_count' => (int) \Illuminate\Support\Facades\DB::table('volunteer_registrations')->where('volunteer_opportunity_id', $this->id)->count(),
            'requirements' => $this->requirements,
            'status' => $this->status,
            'mosque' => $this->whenLoaded('mosque', fn (): array => [
                'id' => $this->mosque->id,
                'name' => $this->mosque->name,
            ]),
            'creator' => $this->whenLoaded('creator', fn (): array => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
