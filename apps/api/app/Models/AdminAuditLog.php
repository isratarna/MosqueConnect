<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['actor_id', 'action', 'target_type', 'target_id', 'metadata', 'created_at'])]
class AdminAuditLog extends Model
{
    public $timestamps = false;

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /** @param array<string, mixed> $metadata */
    public static function record(?User $actor, string $action, Model|string|null $target = null, array $metadata = []): self
    {
        return self::query()->create([
            'actor_id' => $actor?->id,
            'action' => $action,
            'target_type' => $target instanceof Model ? class_basename($target) : $target,
            'target_id' => $target instanceof Model ? $target->getKey() : null,
            'metadata' => $metadata ?: null,
            'created_at' => now(),
        ]);
    }

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
