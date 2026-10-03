<?php

namespace App\Models;

use Database\Factories\AnnouncementFactory;
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
    'body',
    'urgency',
    'status',
    'published_at',
    'publish_at',
    'expires_at',
    'is_pinned',
    'category',
    'image_path',
    'moderation_status',
    'moderation_note',
])]
class Announcement extends Model
{
    /** @use HasFactory<AnnouncementFactory> */
    use HasFactory;

    public const URGENCY_LOW = 'low';

    public const URGENCY_MEDIUM = 'medium';

    public const URGENCY_HIGH = 'high';

    public const URGENCIES = [
        self::URGENCY_LOW,
        self::URGENCY_MEDIUM,
        self::URGENCY_HIGH,
    ];

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_PUBLISHED,
        self::STATUS_SCHEDULED,
    ];

    public const INITIAL_STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_PUBLISHED,
    ];

    public const CATEGORY_GENERAL = 'general';

    public const CATEGORY_JANAZAH = 'janazah';

    public const CATEGORY_JUMUAH = 'jumuah';

    public const CATEGORY_EID = 'eid';

    public const CATEGORY_RAMADAN = 'ramadan';

    public const CATEGORY_DONATION_REQUEST = 'donation_request';

    public const CATEGORY_EVENT = 'event';

    public const CATEGORY_OTHER = 'other';

    public const CATEGORIES = [
        self::CATEGORY_GENERAL,
        self::CATEGORY_JANAZAH,
        self::CATEGORY_JUMUAH,
        self::CATEGORY_EID,
        self::CATEGORY_RAMADAN,
        self::CATEGORY_DONATION_REQUEST,
        self::CATEGORY_EVENT,
        self::CATEGORY_OTHER,
    ];

    public const MAX_PINNED = 3;

    public const MODERATION_PENDING = 'pending';

    public const MODERATION_APPROVED = 'approved';

    public const MODERATION_REJECTED = 'rejected';

    public const MODERATION_STATUSES = [self::MODERATION_PENDING, self::MODERATION_APPROVED, self::MODERATION_REJECTED];

    /**
     * Get the mosque that published this announcement.
     */
    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function contentReports(): HasMany
    {
        return $this->hasMany(ContentReport::class, 'reportable_id')
            ->where('reportable_type', 'announcement');
    }

    /**
     * Order a public announcement list: pinned notices first, then newest.
     */
    public function scopePublicOrder(Builder $query): Builder
    {
        return $query->orderByDesc('is_pinned')->orderByDesc('published_at')->orderByDesc('id');
    }

    /**
     * Limit a query to announcements visible to the public: published,
     * moderation-approved, past their publish_at and not yet expired.
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query
            ->where('status', self::STATUS_PUBLISHED)
            ->where('moderation_status', self::MODERATION_APPROVED)
            ->where(fn (Builder $query) => $query->whereNull('publish_at')->orWhere('publish_at', '<=', now()))
            ->where(fn (Builder $query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }

    /**
     * Limit a query to announcements whose expiry has already passed.
     */
    public function scopeExpired(Builder $query): Builder
    {
        return $query->whereNotNull('expires_at')->where('expires_at', '<=', now());
    }

    /**
     * Apply the supported public announcement list filters to a query.
     *
     * @param  array<string, mixed>  $filters
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['mosque_id'] ?? null, fn (Builder $query, int $mosqueId): Builder => $query->where('mosque_id', $mosqueId))
            ->when($filters['urgency'] ?? null, fn (Builder $query, string $urgency): Builder => $query->where('urgency', $urgency))
            ->when($filters['category'] ?? null, fn (Builder $query, string $category): Builder => $query->where('category', $category))
            ->when($filters['since'] ?? null, fn (Builder $query, string $since): Builder => $query->whereDate('published_at', '>=', $since))
            ->when($filters['district'] ?? null, fn (Builder $query, string $district): Builder => $query->whereHas('mosque', fn (Builder $query): Builder => $query->where('district', $district)))
            ->when($filters['area'] ?? null, fn (Builder $query, string $area): Builder => $query->whereHas('mosque', fn (Builder $query): Builder => $query->where('area', $area)))
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('body', 'like', "%{$search}%");
                });
            });
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'publish_at' => 'datetime',
            'expires_at' => 'datetime',
            'is_pinned' => 'boolean',
        ];
    }
}
