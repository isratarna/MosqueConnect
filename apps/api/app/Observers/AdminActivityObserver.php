<?php

namespace App\Observers;

use App\Models\AdminAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AdminActivityObserver
{
    public function created(Model $model): void
    {
        $this->record($model, 'created', $model->getAttributes());
    }

    public function updated(Model $model): void
    {
        $changes = collect($model->getChanges())->except('updated_at')->all();

        if ($changes !== []) {
            $this->record($model, 'updated', $changes);
        }
    }

    public function deleted(Model $model): void
    {
        $this->record($model, 'deleted');
    }

    /** @param array<string, mixed> $changes */
    private function record(Model $model, string $event, array $changes = []): void
    {
        $actor = auth()->user();

        if (! $actor?->isMosqueAdmin()) {
            return;
        }

        AdminAuditLog::record(
            $actor,
            'mosque_admin.'.Str::snake(class_basename($model)).'.'.$event,
            $model,
            ['changes' => $changes],
        );
    }
}
