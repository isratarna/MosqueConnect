<?php

namespace App\Models;

use Database\Factories\BloodRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'created_by',
    'blood_group',
    'units',
    'hospital_or_location',
    'required_date',
    'urgency',
    'contact_name',
    'contact_phone',
    'notes',
    'status',
    'closed_at',
    'closed_reason',
])]
class BloodRequest extends Model
{
    /** @use HasFactory<BloodRequestFactory> */
    use HasFactory;

    public const BLOOD_GROUPS = [
        'A+',
        'A-',
        'B+',
        'B-',
        'AB+',
        'AB-',
        'O+',
        'O-',
    ];

    public const URGENCY_LOW = 'low';

    public const URGENCY_NORMAL = 'normal';

    public const URGENCY_MEDIUM = 'medium';

    public const URGENCY_HIGH = 'high';

    public const URGENCY_CRITICAL = 'critical';

    public const URGENCIES = [
        self::URGENCY_LOW,
        self::URGENCY_NORMAL,
        self::URGENCY_MEDIUM,
        self::URGENCY_HIGH,
        self::URGENCY_CRITICAL,
    ];

    /**
     * Sort weight per urgency, so the most life-threatening requests can be
     * listed first regardless of how soon they are needed.
     */
    public const URGENCY_PRIORITY = [
        self::URGENCY_CRITICAL => 5,
        self::URGENCY_HIGH => 4,
        self::URGENCY_MEDIUM => 3,
        self::URGENCY_NORMAL => 2,
        self::URGENCY_LOW => 1,
    ];

    public const STATUS_ACTIVE = 'active';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_EXPIRED = 'expired';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_COMPLETED,
        self::STATUS_CLOSED,
        self::STATUS_CANCELLED,
        self::STATUS_EXPIRED,
    ];

    /**
     * Statuses from which a request can still accept new responses.
     */
    public const OPEN_STATUSES = [
        self::STATUS_ACTIVE,
    ];

    /**
     * Statuses that close out the request and block new responses.
     */
    public const CLOSED_STATUSES = [
        self::STATUS_COMPLETED,
        self::STATUS_CLOSED,
        self::STATUS_CANCELLED,
        self::STATUS_EXPIRED,
    ];

    /**
     * Get the user who created this blood request.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the responses offered for this blood request.
     */
    public function responses(): HasMany
    {
        return $this->hasMany(BloodRequestResponse::class);
    }

    /**
     * Whether the request is still open to new responses.
     */
    public function isOpen(): bool
    {
        return $this->status === self::STATUS_ACTIVE && ! $this->isPastDue();
    }

    /**
     * Whether the date the blood is needed on has already passed.
     */
    public function isPastDue(): bool
    {
        return $this->required_date !== null && $this->required_date->isBefore(today());
    }

    /**
     * Limit a query to only open (active) blood requests.
     *
     * Past-due requests are excluded here as a safety net, so an emergency
     * drops off the public list the day it is over even if the hourly expiry
     * task has not run yet.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query
            ->where('status', self::STATUS_ACTIVE)
            ->whereDate('required_date', '>=', today());
    }

    /**
     * Apply the supported public list filters to a query.
     *
     * @param  array<string, mixed>  $filters
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['blood_group'] ?? null, fn (Builder $query, string $bloodGroup): Builder => $query->where('blood_group', $bloodGroup))
            ->when($filters['urgency'] ?? null, fn (Builder $query, string $urgency): Builder => $query->where('urgency', $urgency))
            ->when($filters['area'] ?? null, fn (Builder $query, string $area): Builder => $query->where('hospital_or_location', 'like', "%{$area}%"))
            ->when($filters['needed_before'] ?? null, fn (Builder $query, string $date): Builder => $query->whereDate('required_date', '<=', $date));
    }

    /**
     * Order the most urgent requests first. Ties fall back to the caller's
     * own ordering, which is the soonest required date.
     */
    public function scopeUrgencyFirst(Builder $query): Builder
    {
        $cases = collect(self::URGENCY_PRIORITY)
            ->map(fn (int $rank, string $urgency): string => "WHEN '{$urgency}' THEN {$rank}")
            ->implode(' ');

        return $query->orderByRaw("CASE urgency {$cases} ELSE 0 END DESC");
    }

    /**
     * Close out every request whose required date has passed. Called hourly by
     * the scheduler.
     */
    public static function expirePastDue(): int
    {
        return static::query()
            ->where('status', self::STATUS_ACTIVE)
            ->whereDate('required_date', '<', today())
            ->update([
                'status' => self::STATUS_EXPIRED,
                'closed_at' => now(),
                'updated_at' => now(),
            ]);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'units' => 'integer',
            'required_date' => 'date',
            'closed_at' => 'datetime',
        ];
    }
}
