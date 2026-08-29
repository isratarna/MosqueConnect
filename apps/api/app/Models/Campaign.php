<?php

namespace App\Models;

use Database\Factories\CampaignFactory;
use DomainException;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'mosque_id', 'created_by', 'title', 'summary', 'description', 'category',
    'target_amount', 'currency', 'starts_on', 'ends_on', 'image_url', 'status',
    'moderation_status', 'moderation_note',
])]
class Campaign extends Model
{
    /** @use HasFactory<CampaignFactory> */
    use HasFactory;

    public const CATEGORY_MOSQUE_DEVELOPMENT = 'Mosque Development';

    public const CATEGORY_EMERGENCY_RELIEF = 'Emergency Relief';

    public const CATEGORY_EDUCATION = 'Education';

    public const CATEGORY_FOOD_ESSENTIALS = 'Food & Essentials';

    public const CATEGORY_HEALTHCARE = 'Healthcare';

    public const CATEGORY_ORPHAN_SUPPORT = 'Orphan Support';

    public const CATEGORY_COMMUNITY_WELFARE = 'Community Welfare';

    public const CATEGORY_OTHER = 'Other';

    public const CATEGORIES = [
        self::CATEGORY_MOSQUE_DEVELOPMENT,
        self::CATEGORY_EMERGENCY_RELIEF,
        self::CATEGORY_EDUCATION,
        self::CATEGORY_FOOD_ESSENTIALS,
        self::CATEGORY_HEALTHCARE,
        self::CATEGORY_ORPHAN_SUPPORT,
        self::CATEGORY_COMMUNITY_WELFARE,
        self::CATEGORY_OTHER,
    ];

    public const STATUS_DRAFT = 'draft';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_EXPIRED = 'expired';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_ACTIVE,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
        self::STATUS_EXPIRED,
    ];

    public const MODERATION_PENDING = 'pending';

    public const MODERATION_APPROVED = 'approved';

    public const MODERATION_REJECTED = 'rejected';

    public const MODERATION_STATUSES = [self::MODERATION_PENDING, self::MODERATION_APPROVED, self::MODERATION_REJECTED];

    public const INITIAL_STATUSES = [self::STATUS_DRAFT, self::STATUS_ACTIVE];

    private const STATUS_TRANSITIONS = [
        self::STATUS_DRAFT => [self::STATUS_ACTIVE, self::STATUS_CANCELLED],
        self::STATUS_ACTIVE => [self::STATUS_COMPLETED, self::STATUS_CANCELLED, self::STATUS_EXPIRED],
        self::STATUS_COMPLETED => [],
        self::STATUS_CANCELLED => [],
        self::STATUS_EXPIRED => [],
    ];

    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function donations(): HasMany
    {
        return $this->hasMany(CampaignDonation::class);
    }

    public function contentReports(): HasMany
    {
        return $this->hasMany(ContentReport::class, 'reportable_id')
            ->where('reportable_type', 'campaign');
    }

    public function scopePubliclyActive(Builder $query): Builder
    {
        return $query
            ->where('status', self::STATUS_ACTIVE)
            ->where('moderation_status', self::MODERATION_APPROVED)
            ->whereDate('starts_on', '<=', today())
            ->whereDate('ends_on', '>=', today());
    }

    /** @param array<string, mixed> $filters */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['category'] ?? null, fn (Builder $query, string $category): Builder => $query->where('category', $category))
            ->when($filters['mosque_id'] ?? null, fn (Builder $query, int $mosqueId): Builder => $query->where('mosque_id', $mosqueId))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status): Builder => $query->where('status', $status))
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('summary', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('mosque', fn (Builder $query): Builder => $query->where('name', 'like', "%{$search}%"));
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
            throw new DomainException("The campaign status cannot transition from {$this->status} to {$status}.");
        }

        $this->status = $status;
    }

    public function acceptsDonations(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && ! today()->isBefore($this->starts_on)
            && ! today()->isAfter($this->ends_on);
    }

    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:2',
            'raised_amount' => 'decimal:2',
            'starts_on' => 'date:Y-m-d',
            'ends_on' => 'date:Y-m-d',
        ];
    }
}
