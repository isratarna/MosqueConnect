<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\SuperAdminDashboardResource;
use App\Models\AdminAuditLog;
use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\Mosque;
use App\Models\User;
use App\Models\VerificationRequest;

class SuperAdminDashboardController extends Controller
{
    public function index(): SuperAdminDashboardResource
    {
        return new SuperAdminDashboardResource([
            'platform' => [
                'total_mosques' => Mosque::count(),
                'verified_mosques_count' => Mosque::query()->where('verification_status', Mosque::VERIFICATION_VERIFIED)->count(),
                'pending_verification_requests_count' => $this->pendingVerificationCount(),
                'total_registered_users' => User::count(),
                'pending_moderation_count' => $this->pendingModerationCount(),
                'pending_content_reports_count' => ContentReport::query()
                    ->whereIn('status', [ContentReport::STATUS_PENDING, ContentReport::STATUS_REVIEWING])
                    ->count(),
            ],
            'breakdown' => [
                'mosques_by_verification_status' => $this->countBy(Mosque::query(), 'verification_status', Mosque::VERIFICATION_STATUSES),
                'users_by_role' => $this->countBy(User::query(), 'role', User::ROLES),
            ],
            'pending_verification_requests' => VerificationRequest::query()
                ->whereIn('status', VerificationRequest::ACTIVE_STATUSES)
                ->with('mosque:id,name')
                ->latest('submitted_at')
                ->limit(10)
                ->get()
                ->map(fn (VerificationRequest $request): array => [
                    'id' => $request->id,
                    'mosque_id' => $request->mosque_id,
                    'mosque_name' => $request->mosque?->name,
                    'status' => $request->status,
                    'submitted_at' => $request->submitted_at?->toJSON(),
                ])
                ->values()
                ->all(),
            'pending_content_reports' => ContentReport::query()
                ->whereIn('status', [ContentReport::STATUS_PENDING, ContentReport::STATUS_REVIEWING])
                ->latest('id')
                ->limit(10)
                ->get()
                ->map(fn (ContentReport $report): array => [
                    'id' => $report->id,
                    'type' => $report->reportable_type,
                    'category' => $report->category,
                    'reason' => $report->reason,
                    'status' => $report->status,
                    'created_at' => $report->created_at?->toJSON(),
                ])
                ->values()
                ->all(),
            'recent_admin_activity' => AdminAuditLog::query()
                ->with('actor:id,name')
                ->latest('id')
                ->limit(8)
                ->get()
                ->map(fn (AdminAuditLog $log): array => [
                    'id' => $log->id,
                    'actor_name' => $log->actor?->name,
                    'action' => $log->action,
                    'target_type' => $log->target_type,
                    'created_at' => $log->created_at?->toJSON(),
                ])
                ->values()
                ->all(),
            'generated_at' => now()->toJSON(),
        ]);
    }

    private function pendingVerificationCount(): int
    {
        return VerificationRequest::query()
            ->whereIn('status', VerificationRequest::ACTIVE_STATUSES)
            ->count();
    }

    private function pendingModerationCount(): int
    {
        return Announcement::query()->where('moderation_status', Announcement::MODERATION_PENDING)->count()
            + Event::query()->where('moderation_status', Event::MODERATION_PENDING)->count()
            + Campaign::query()->where('moderation_status', Campaign::MODERATION_PENDING)->count();
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<*>  $query
     * @param  list<string>  $values
     * @return array<string, int>
     */
    private function countBy($query, string $column, array $values): array
    {
        return collect($values)->mapWithKeys(fn (string $value): array => [
            $value => (clone $query)->where($column, $value)->count(),
        ])->all();
    }
}
