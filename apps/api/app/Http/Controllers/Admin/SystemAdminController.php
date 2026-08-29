<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\Mosque;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Http\JsonResponse;

class SystemAdminController extends Controller
{
    public function overview(): JsonResponse
    {
        return response()->json([
            'users_count' => User::count(),
            'mosques_count' => Mosque::count(),
            'verified_mosques_count' => Mosque::query()->where('verification_status', Mosque::VERIFICATION_VERIFIED)->count(),
            'pending_claims_count' => VerificationRequest::query()->whereIn('status', ['pending', 'ai_reviewed', 'under_human_review'])->count(),
            'active_reports_count' => ContentReport::query()->whereIn('status', [ContentReport::STATUS_PENDING, ContentReport::STATUS_REVIEWING])->count(),
            'pending_moderation_count' => $this->pendingModerationCount(),
            'users_by_role' => $this->countBy(User::query(), 'role', User::ROLES),
            'mosques_by_status' => $this->countBy(Mosque::query(), 'verification_status', Mosque::VERIFICATION_STATUSES),
            'recent_activity' => AdminAuditLog::query()
                ->with('actor:id,name')
                ->latest('id')
                ->limit(8)
                ->get(),
        ]);
    }

    public function statistics(): JsonResponse
    {
        $months = collect(range(5, 0))->map(function (int $offset): array {
            $month = now()->startOfMonth()->subMonths($offset);

            return [
                'key' => $month->format('Y-m'),
                'label' => $month->format('M Y'),
                'users' => User::query()->whereBetween('created_at', [$month, $month->copy()->endOfMonth()])->count(),
                'mosques' => Mosque::query()->whereBetween('created_at', [$month, $month->copy()->endOfMonth()])->count(),
                'claims' => VerificationRequest::query()->whereBetween('submitted_at', [$month, $month->copy()->endOfMonth()])->count(),
                'reports' => ContentReport::query()->whereBetween('created_at', [$month, $month->copy()->endOfMonth()])->count(),
            ];
        });

        return response()->json([
            'data' => [
                'monthly' => $months,
                'content' => [
                    'announcements' => Announcement::count(),
                    'events' => Event::count(),
                    'campaigns' => Campaign::count(),
                ],
                'moderation' => [
                    'pending' => $this->pendingModerationCount(),
                    'rejected' => Announcement::query()->where('moderation_status', 'rejected')->count()
                        + Event::query()->where('moderation_status', 'rejected')->count()
                        + Campaign::query()->where('moderation_status', 'rejected')->count(),
                ],
            ],
        ]);
    }

    private function pendingModerationCount(): int
    {
        return Announcement::query()->where('moderation_status', 'pending')->count()
            + Event::query()->where('moderation_status', 'pending')->count()
            + Campaign::query()->where('moderation_status', 'pending')->count();
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
