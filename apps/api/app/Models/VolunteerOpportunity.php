<?php

namespace App\Models;

use Database\Factories\VolunteerOpportunityFactory;
use DomainException;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    public function applications(): HasMany
    {
        return $this->hasMany(VolunteerApplication::class, 'volunteer_opportunity_id');
    }

    public function registeredUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'volunteer_applications')
            ->withPivot(['id', 'status', 'created_at', 'reviewed_at', 'cancelled_at'])
            ->withTimestamps()
            ->wherePivot('status', '!=', VolunteerApplication::STATUS_CANCELLED);
    }

    public function scopeAvailable(Builder $query): Builder
    {
        return $query
            ->where('status', self::STATUS_ACTIVE)
            ->whereDate('opportunity_date', '>=', today());
    }

    /**
     * Order the public list by soonest opportunity first, since that is what a
     * volunteer looking for something to join wants to see.
     */
    public function scopePublicOrder(Builder $query): Builder
    {
        return $query->orderBy('opportunity_date')->orderBy('start_time')->orderBy('id');
    }

    /**
     * Apply the supported public opportunity list filters to a query.
     *
     * @param  array<string, mixed>  $filters
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['mosque_id'] ?? null, fn (Builder $query, int $mosqueId): Builder => $query->where('mosque_id', $mosqueId))
            ->when($filters['since'] ?? null, fn (Builder $query, string $since): Builder => $query->whereDate('opportunity_date', '>=', $since))
            ->when($filters['district'] ?? null, fn (Builder $query, string $district): Builder => $query->whereHas('mosque', fn (Builder $query): Builder => $query->where('district', $district)))
            ->when($filters['area'] ?? null, fn (Builder $query, string $area): Builder => $query->whereHas('mosque', fn (Builder $query): Builder => $query->where('area', $area)))
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");
                });
            });
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
