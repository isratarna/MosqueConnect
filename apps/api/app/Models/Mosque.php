<?php

namespace App\Models;

use Database\Factories\MosqueFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'address',
    'latitude',
    'longitude',
    'phone',
    'description',
    'verification_status',
])]
class Mosque extends Model
{
    /** @use HasFactory<MosqueFactory> */
    use HasFactory;

    public const VERIFICATION_UNVERIFIED = 'unverified';

    public const VERIFICATION_PENDING = 'pending';

    public const VERIFICATION_VERIFIED = 'verified';

    public const VERIFICATION_REJECTED = 'rejected';

    public const VERIFICATION_STATUSES = [
        self::VERIFICATION_UNVERIFIED,
        self::VERIFICATION_PENDING,
        self::VERIFICATION_VERIFIED,
        self::VERIFICATION_REJECTED,
    ];

    /**
     * Get the user assigned to administer this mosque.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get the follower records for the mosque.
     */
    public function followers(): HasMany
    {
        return $this->hasMany(Follower::class);
    }

    /**
     * Get the users who follow the mosque.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'followers');
    }

    /**
     * Get the verification requests for the mosque.
     */
    public function verificationRequests(): HasMany
    {
        return $this->hasMany(VerificationRequest::class);
    }

    /**
     * Get the community events hosted by the mosque.
     */
    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    /**
     * Get notifications generated for followers of this mosque.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function isVerified(): bool
    {
        return $this->verification_status === self::VERIFICATION_VERIFIED;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }
}
