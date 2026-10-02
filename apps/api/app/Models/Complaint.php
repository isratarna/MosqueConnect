<?php

namespace App\Models;

use Database\Factories\ComplaintFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Private feedback to a mosque. Only the author, that mosque's team and the
 * super admin may read it (see ComplaintPolicy).
 */
#[Fillable([
    'mosque_id',
    'user_id',
    'category',
    'subject',
    'body',
    'is_anonymous',
    'status',
    'admin_response',
    'responded_at',
])]
class Complaint extends Model
{
    /** @use HasFactory<ComplaintFactory> */
    use HasFactory;

    public const CATEGORIES = ['cleanliness', 'facilities', 'timing', 'safety', 'management', 'suggestion', 'other'];

    public const STATUS_OPEN = 'open';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_DISMISSED = 'dismissed';

    public const STATUSES = [self::STATUS_OPEN, self::STATUS_IN_PROGRESS, self::STATUS_RESOLVED, self::STATUS_DISMISSED];

    /** Complaints the mosque still has to deal with. */
    public const OPEN_STATUSES = [self::STATUS_OPEN, self::STATUS_IN_PROGRESS];

    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereIn('status', self::OPEN_STATUSES);
    }

    protected function casts(): array
    {
        return [
            'is_anonymous' => 'boolean',
            'responded_at' => 'datetime',
        ];
    }
}
