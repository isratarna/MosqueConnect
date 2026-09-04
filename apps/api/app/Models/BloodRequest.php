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

    public const URGENCY_MEDIUM = 'medium';

    public const URGENCY_HIGH = 'high';

    public const URGENCY_CRITICAL = 'critical';

    public const URGENCIES = [
        self::URGENCY_LOW,
        self::URGENCY_MEDIUM,
        self::URGENCY_HIGH,
        self::URGENCY_CRITICAL,
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
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Limit a query to only open (active) blood requests.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
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
