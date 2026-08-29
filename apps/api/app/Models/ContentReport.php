<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'reporter_id', 'reportable_type', 'reportable_id', 'category', 'reason', 'details',
    'status', 'reviewer_id', 'resolution_note', 'reviewed_at',
])]
class ContentReport extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_REVIEWING = 'reviewing';

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_DISMISSED = 'dismissed';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_REVIEWING,
        self::STATUS_RESOLVED,
        self::STATUS_DISMISSED,
    ];

    public const TYPES = ['announcement', 'event', 'campaign', 'mosque'];

    public const CATEGORIES = ['inaccurate', 'inappropriate', 'fraud', 'safety', 'spam', 'other'];

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }
}
