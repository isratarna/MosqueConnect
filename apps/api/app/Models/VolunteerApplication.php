<?php

namespace App\Models;

use Database\Factories\VolunteerApplicationFactory;
use DomainException;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VolunteerApplication extends Model
{
    /** @use HasFactory<VolunteerApplicationFactory> */
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_ACCEPTED,
        self::STATUS_REJECTED,
        self::STATUS_CANCELLED,
    ];

    public const ACTIVE_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_ACCEPTED,
    ];

    public const TERMINAL_STATUSES = [
        self::STATUS_REJECTED,
        self::STATUS_CANCELLED,
    ];

    protected $table = 'volunteer_applications';

    protected $fillable = [
        'volunteer_opportunity_id',
        'user_id',
        'status',
        'reviewed_by',
        'reviewed_at',
        'cancelled_at',
    ];

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(VolunteerOpportunity::class, 'volunteer_opportunity_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function isActive(): bool
    {
        return in_array($this->status, self::ACTIVE_STATUSES, true);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isAccepted(): bool
    {
        return $this->status === self::STATUS_ACCEPTED;
    }

    public function canTransitionTo(string $status): bool
    {
        if ($this->status === $status) {
            return true;
        }

        return match ($this->status) {
            self::STATUS_PENDING => in_array($status, [self::STATUS_ACCEPTED, self::STATUS_REJECTED, self::STATUS_CANCELLED], true),
            self::STATUS_ACCEPTED => in_array($status, [self::STATUS_REJECTED, self::STATUS_CANCELLED], true),
            self::STATUS_CANCELLED => $status === self::STATUS_PENDING,
            default => false,
        };
    }

    public function transitionTo(string $status): void
    {
        if (! $this->canTransitionTo($status)) {
            throw new DomainException("The volunteer application status cannot transition from {$this->status} to {$status}.");
        }

        if ($status === self::STATUS_PENDING) {
            $this->status = self::STATUS_PENDING;
            $this->reviewed_by = null;
            $this->reviewed_at = null;
            $this->cancelled_at = null;

            return;
        }

        $this->status = $status;

        if (in_array($status, [self::STATUS_ACCEPTED, self::STATUS_REJECTED], true)) {
            $this->reviewed_at ??= now();
        }

        if ($status === self::STATUS_CANCELLED) {
            $this->cancelled_at ??= now();
        }
    }

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }
}
