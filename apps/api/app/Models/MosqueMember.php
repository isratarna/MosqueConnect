<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One person on a mosque's team. A null accepted_at means the invitation is
 * still pending; a null user_id means it was sent to a phone number that has
 * no account yet.
 */
#[Fillable([
    'mosque_id',
    'user_id',
    'phone',
    'role',
    'invited_by',
    'accepted_at',
])]
class MosqueMember extends Model
{
    public const ROLE_OWNER = 'owner';

    public const ROLE_MANAGER = 'manager';

    public const ROLE_EDITOR = 'editor';

    public const ROLE_PRAYER_TIMES = 'prayer_times';

    public const ROLES = [
        self::ROLE_OWNER,
        self::ROLE_MANAGER,
        self::ROLE_EDITOR,
        self::ROLE_PRAYER_TIMES,
    ];

    public const ROLE_LABELS = [
        self::ROLE_OWNER => 'Owner',
        self::ROLE_MANAGER => 'Manager',
        self::ROLE_EDITOR => 'Editor',
        self::ROLE_PRAYER_TIMES => 'Prayer times',
    ];

    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function scopeAccepted(Builder $query): Builder
    {
        return $query->whereNotNull('accepted_at');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->whereNull('accepted_at');
    }

    public function isAccepted(): bool
    {
        return $this->accepted_at !== null;
    }

    public function isOwner(): bool
    {
        return $this->role === self::ROLE_OWNER;
    }

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
        ];
    }
}
