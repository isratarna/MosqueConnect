<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Summarized platform-level statistics for the Super Admin dashboard.
 *
 * @property array<string, mixed> $resource
 */
class SuperAdminDashboardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'platform' => $this->resource['platform'],
            'breakdown' => $this->resource['breakdown'],
            'pending_work' => [
                'verification_requests' => $this->resource['pending_verification_requests'],
                'content_reports' => $this->resource['pending_content_reports'],
            ],
            'recent_admin_activity' => $this->resource['recent_admin_activity'],
            'generated_at' => $this->resource['generated_at'],
        ];
    }
}
