<?php

namespace App\Models;

use Database\Factories\VolunteerOpportunityFactory;
use DomainException;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'mosque_id',
    'created_by',
    'title',
    'description',
    'opportunity_date',
    'start_time',
    'end_time',
    'location',
    'volunteers_required',
    'requirements',
    'status',
])]
class VolunteerOpportunity extends Model
{
    /** @use HasFactory<VolunteerOpportunityFactory> */
    use HasFactory;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_CLOSED,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
    ];

    public const INITIAL_STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_CLOSED,
    ];

    private const STATUS_TRANSITIONS = [
        self::STATUS_ACTIVE => [self::STATUS_CLOSED, self::STATUS_COMPLETED, self::STATUS_CANCELLED],
        self::STATUS_CLOSED => [self::STATUS_ACTIVE, self::STATUS_COMPLETED, self::STATUS_CANCELLED],
        self::STATUS_COMPLETED => [],
        self::STATUS_CANCELLED => [],
    ];

    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeAvailable(Builder $query): Builder
    {
        return $query
            ->where('status', self::STATUS_ACTIVE)
            ->whereDate('opportunity_date', '>=', today());
    }

    public function canTransitionTo(string $status): bool
    {
        return $status === $this->status
            || in_array($status, self::STATUS_TRANSITIONS[$this->status] ?? [], true);
    }

    public function transitionTo(string $status): void
    {
        if (! $this->canTransitionTo($status)) {
            throw new DomainException("The volunteer opportunity status cannot transition from {$this->status} to {$status}.");
        }

        $this->status = $status;
    }

    protected function casts(): array
    {
        return [
            'opportunity_date' => 'date:Y-m-d',
            'volunteers_required' => 'integer',
        ];
    }
}
