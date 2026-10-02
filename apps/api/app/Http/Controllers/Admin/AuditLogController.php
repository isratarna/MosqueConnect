<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    private const EXPORT_LIMIT = 10000;

    public function index(Request $request): JsonResponse
    {
        $filters = $this->filters($request);

        return response()->json(
            $this->query($filters)->with('actor:id,name,phone')->latest('id')->paginate($filters['per_page'] ?? 30),
        );
    }

    /** The distinct actions, for the filter dropdown. */
    public function actions(): JsonResponse
    {
        return response()->json([
            'data' => AdminAuditLog::query()->distinct()->orderBy('action')->pluck('action'),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $query = $this->query($this->filters($request))->with('actor:id,name')->latest('id')->limit(self::EXPORT_LIMIT);

        return response()->streamDownload(function () use ($query): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['id', 'time', 'actor_id', 'actor', 'action', 'target_type', 'target_id', 'details']);

            foreach ($query->lazy() as $log) {
                fputcsv($out, array_map([$this, 'csvSafe'], [
                    $log->id,
                    $log->created_at?->toDateTimeString(),
                    $log->actor_id,
                    $log->actor?->name ?? 'System',
                    $log->action,
                    $log->target_type,
                    $log->target_id,
                    $log->metadata ? json_encode($log->metadata, JSON_UNESCAPED_UNICODE) : '',
                ]));
            }

            fclose($out);
        }, 'audit-log-'.now()->format('Y-m-d-His').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return array<string, mixed> */
    private function filters(Request $request): array
    {
        return $request->validate([
            'action' => ['nullable', 'string', 'max:100'],
            'actor_id' => ['nullable', 'integer'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);
    }

    /** @param  array<string, mixed>  $filters */
    private function query(array $filters): Builder
    {
        return AdminAuditLog::query()
            ->when($filters['action'] ?? null, fn (Builder $query, string $action) => $query->where('action', $action))
            ->when($filters['actor_id'] ?? null, fn (Builder $query, $actorId) => $query->where('actor_id', $actorId))
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->where('created_at', '>=', "{$from} 00:00:00"))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->where('created_at', '<=', "{$to} 23:59:59"))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(fn (Builder $query) => $query->where('action', 'like', "%{$search}%")->orWhere('target_type', 'like', "%{$search}%")));
    }

    /** Stops spreadsheet apps from running a cell as a formula. */
    private function csvSafe(mixed $value): mixed
    {
        return is_string($value) && preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
    }
}
