<?php

namespace App\Models;

use Database\Factories\EventFactory;
use DomainException;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'mosque_id',
    'created_by',
    'title',
    'description',
    'category',
    'event_date',
    'start_time',
    'end_time',
    'location',
    'capacity',
    'registration_required',
    'status',
    'moderation_status',
    'moderation_note',
])]
class Event extends Model
{
    /** @use HasFactory<EventFactory> */
    use HasFactory;

    public const CATEGORY_ISLAMIC_LECTURE = 'Islamic Lecture';

    public const CATEGORY_QURAN_PROGRAM = 'Quran Program';

    public const CATEGORY_COMMUNITY_GATHERING = 'Community Gathering';

    public const CATEGORY_CHARITY = 'Charity';

    public const CATEGORY_VOLUNTEER_ACTIVITY = 'Volunteer Activity';

    public const CATEGORY_YOUTH_PROGRAM = 'Youth Program';

    public const CATEGORY_WORKSHOP = 'Workshop';

    public const CATEGORY_IFTAR = 'Iftar';

    public const CATEGORY_EDUCATIONAL_PROGRAM = 'Educational Program';

    public const CATEGORY_OTHER = 'Other';

    public const CATEGORIES = [
        self::CATEGORY_ISLAMIC_LECTURE,
        self::CATEGORY_QURAN_PROGRAM,
        self::CATEGORY_COMMUNITY_GATHERING,
        self::CATEGORY_CHARITY,
        self::CATEGORY_VOLUNTEER_ACTIVITY,
        self::CATEGORY_YOUTH_PROGRAM,
        self::CATEGORY_WORKSHOP,
        self::CATEGORY_IFTAR,
        self::CATEGORY_EDUCATIONAL_PROGRAM,
        self::CATEGORY_OTHER,
    ];

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_COMPLETED = 'completed';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_PUBLISHED,
        self::STATUS_CANCELLED,
        self::STATUS_COMPLETED,
    ];

    public const MODERATION_PENDING = 'pending';

    public const MODERATION_APPROVED = 'approved';

    public const MODERATION_REJECTED = 'rejected';

    public const MODERATION_STATUSES = [self::MODERATION_PENDING, self::MODERATION_APPROVED, self::MODERATION_REJECTED];

    public const INITIAL_STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_PUBLISHED,
    ];

    private const STATUS_TRANSITIONS = [
        self::STATUS_DRAFT => [self::STATUS_PUBLISHED],
        self::STATUS_PUBLISHED => [self::STATUS_CANCELLED, self::STATUS_COMPLETED],
        self::STATUS_CANCELLED => [],
        self::STATUS_COMPLETED => [],
    ];

    /**
     * Get the mosque hosting the event.
     */
    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    /**
     * Get the user who created the event.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function contentReports(): HasMany
    {
        return $this->hasMany(ContentReport::class, 'reportable_id')
            ->where('reportable_type', 'event');
    }

    /**
     * Limit a query to events visible to the public.
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query
            ->where('status', self::STATUS_PUBLISHED)
            ->where('moderation_status', self::MODERATION_APPROVED);
    }

    /**
     * Apply supported event-list filters to a query.
     *
     * @param  array<string, mixed>  $filters
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['category'] ?? null, fn (Builder $query, string $category): Builder => $query->where('category', $category))
            ->when($filters['mosque_id'] ?? null, fn (Builder $query, int $mosqueId): Builder => $query->where('mosque_id', $mosqueId))
            ->when($filters['date'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('event_date', $date))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status): Builder => $query->where('status', $status))
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%")
                        ->orWhereHas('mosque', fn (Builder $query): Builder => $query->where('name', 'like', "%{$search}%"));
                });
            });
    }

    public function canTransitionTo(string $status): bool
    {
        if ($status === $this->status) {
            return true;
        }

        return in_array($status, self::STATUS_TRANSITIONS[$this->status] ?? [], true);
    }

    public function transitionTo(string $status): void
    {
        if (! $this->canTransitionTo($status)) {
            throw new DomainException("The event status cannot transition from {$this->status} to {$status}.");
        }

        $this->status = $status;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'event_date' => 'date:Y-m-d',
            'capacity' => 'integer',
            'registration_required' => 'boolean',
        ];
    }
}
