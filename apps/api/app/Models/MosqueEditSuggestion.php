<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'mosque_id',
    'user_id',
    'field',
    'payload',
    'before',
    'note',
    'status',
    'reviewed_by',
    'review_note',
    'reviewed_at',
])]
class MosqueEditSuggestion extends Model
{
    public const FIELD_PRAYER_TIME = 'prayer_time';

    public const FIELD_JUMUAH = 'jumuah';

    public const FIELD_PHONE = 'phone';

    public const FIELD_ADDRESS = 'address';

    public const FIELD_LOCATION = 'location';

    public const FIELD_FACILITIES = 'facilities';

    public const FIELD_OTHER = 'other';

    public const FIELDS = [
        self::FIELD_PRAYER_TIME,
        self::FIELD_JUMUAH,
        self::FIELD_PHONE,
        self::FIELD_ADDRESS,
        self::FIELD_LOCATION,
        self::FIELD_FACILITIES,
        self::FIELD_OTHER,
    ];

    /** Fields that change the mosque's prayer or Jumuah times. */
    public const TIME_FIELDS = [self::FIELD_PRAYER_TIME, self::FIELD_JUMUAH];

    public const STATUS_PENDING = 'pending';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_REJECTED = 'rejected';

    public const STATUSES = [self::STATUS_PENDING, self::STATUS_ACCEPTED, self::STATUS_REJECTED];

    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeAccepted(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACCEPTED);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'before' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }
}
