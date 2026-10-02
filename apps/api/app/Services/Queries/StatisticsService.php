<?php

namespace App\Services\Queries;

use App\Models\AdminAuditLog;
use App\Models\ContentReport;
use App\Models\Mosque;
use App\Models\User;
use App\Models\VerificationRequest;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class StatisticsService
{
    /** @return array<string, mixed> */
    public function overview(): array
    {
        return [
            'users_count' => User::count(),
            'mosques_count' => Mosque::count(),
            'verified_mosques_count' => Mosque::query()->where('verification_status', Mosque::VERIFICATION_VERIFIED)->count(),
            'pending_claims_count' => VerificationRequest::query()->whereIn('status', ['pending', 'ai_reviewed', 'under_human_review'])->count(),
            'active_reports_count' => ContentReport::query()->whereIn('status', [ContentReport::STATUS_PENDING, ContentReport::STATUS_REVIEWING])->count(),
            'pending_moderation_count' => $this->contentTotals()['pending'],
            'users_by_role' => $this->countBy(User::query(), 'role', User::ROLES),
            'mosques_by_status' => $this->countBy(Mosque::query(), 'verification_status', Mosque::VERIFICATION_STATUSES),
            'recent_activity' => AdminAuditLog::query()
                ->with('actor:id,name')
                ->latest('id')
                ->limit(8)
                ->get(),
        ];
    }

    /** @return array<string, mixed> */
    public function statistics(): array
    {
        $currentMonth = CarbonImmutable::now()->startOfMonth();
        $start = $currentMonth->subMonths(5);
        $end = $currentMonth->addMonth();
        $monthExpression = DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', created_at)"
            : "DATE_FORMAT(created_at, '%Y-%m')";

        $users = $this->monthlyTotals('users', 'created_at', $monthExpression, $start, $end);
        $mosques = $this->monthlyTotals('mosques', 'created_at', $monthExpression, $start, $end);
        $claims = $this->monthlyTotals('verification_requests', 'submitted_at', $monthExpression, $start, $end);
        $reports = $this->monthlyTotals('content_reports', 'created_at', $monthExpression, $start, $end);
        $content = $this->contentTotals();

        return [
            'monthly' => collect(range(5, 0))->map(function (int $offset) use ($currentMonth, $users, $mosques, $claims, $reports): array {
                $month = $currentMonth->subMonths($offset);
                $key = $month->format('Y-m');

                return [
                    'key' => $key,
                    'label' => $month->format('M Y'),
                    'users' => $users[$key] ?? 0,
                    'mosques' => $mosques[$key] ?? 0,
                    'claims' => $claims[$key] ?? 0,
                    'reports' => $reports[$key] ?? 0,
                ];
            }),
            'content' => [
                'announcements' => $content['announcements'],
                'events' => $content['events'],
                'campaigns' => $content['campaigns'],
            ],
            'moderation' => [
                'pending' => $content['pending'],
                'rejected' => $content['rejected'],
            ],
        ];
    }

    /** @return array<string, int> */
    private function monthlyTotals(string $table, string $column, string $monthExpression, CarbonImmutable $start, CarbonImmutable $end): array
    {
        return DB::table($table)
            ->selectRaw($monthExpression.' as month, COUNT(*) as total')
            ->where($column, '>=', $start)
            ->where($column, '<', $end)
            ->groupBy('month')
            ->pluck('total', 'month')
            ->map(fn ($total): int => (int) $total)
            ->all();
    }

    /** @return array{announcements: int, events: int, campaigns: int, pending: int, rejected: int} */
    private function contentTotals(): array
    {
        $groups = DB::query()->fromSub(
            DB::table('announcements')
                ->selectRaw("'announcements' as kind, moderation_status, COUNT(*) as total")
                ->groupBy('moderation_status')
                ->unionAll(DB::table('events')->selectRaw("'events' as kind, moderation_status, COUNT(*) as total")->groupBy('moderation_status'))
                ->unionAll(DB::table('campaigns')->selectRaw("'campaigns' as kind, moderation_status, COUNT(*) as total")->groupBy('moderation_status')),
            'content_groups',
        )->get();

        $totals = ['announcements' => 0, 'events' => 0, 'campaigns' => 0, 'pending' => 0, 'rejected' => 0];
        foreach ($groups as $group) {
            $totals[$group->kind] += (int) $group->total;
            if ($group->moderation_status === 'pending') {
                $totals['pending'] += (int) $group->total;
            }
            if ($group->moderation_status === 'rejected') {
                $totals['rejected'] += (int) $group->total;
            }
        }

        return $totals;
    }

    /** @param list<string> $values
     * @return array<string, int>
     */
    private function countBy($query, string $column, array $values): array
    {
        return collect($values)->mapWithKeys(fn (string $value): array => [
            $value => (int) (clone $query)->where($column, $value)->count(),
        ])->all();
    }
}
