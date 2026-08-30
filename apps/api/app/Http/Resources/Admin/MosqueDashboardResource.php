<?php

namespace App\Http\Resources\Admin;

use App\Models\Mosque;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Summarized dashboard data for a mosque the admin is authorized to manage.
 *
 * @property Mosque $resource
 */
class MosqueDashboardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        $mosque = $this->resource;

        return [
            'mosque' => [
                'id' => $mosque->id,
                'name' => $mosque->name,
                'address' => $mosque->address,
                'phone' => $mosque->phone,
                'latitude' => $mosque->latitude,
                'longitude' => $mosque->longitude,
                'verification_status' => $mosque->verification_status,
                'verified' => $mosque->isVerified(),
            ],
            'summary' => [
                'followers_count' => (int) $mosque->followers_count,
                'active_announcements_count' => (int) $mosque->active_announcements_count,
                'upcoming_events_count' => (int) $mosque->upcoming_events_count,
                'active_campaigns_count' => (int) $mosque->active_campaigns_count,
                'pending_content_reports_count' => (int) $mosque->pending_content_reports_count,
            ],
            'recent_content' => $mosque->recent_content,
            'pending_content_reports' => $mosque->pending_content_reports,
        ];
    }
}
