<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_NORMAL_USER = 'normal_user';

    public const ROLE_MOSQUE_ADMIN = 'mosque_admin';

    public const ROLE_SUPER_ADMIN = 'super_admin';

    public const ROLES = [
        self::ROLE_NORMAL_USER,
        self::ROLE_MOSQUE_ADMIN,
        self::ROLE_SUPER_ADMIN,
    ];

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SUSPENDED = 'suspended';

    public const ACCOUNT_STATUSES = [self::STATUS_ACTIVE, self::STATUS_SUSPENDED];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'phone',
        'role',
        'account_status',
        'suspended_at',
        'suspension_reason',
    ];

    /**
     * Get the follower records for the user.
     */
    public function followers(): HasMany
    {
        return $this->hasMany(Follower::class);
    }

    /**
     * Get the mosques followed by the user.
     */
    public function mosques(): BelongsToMany
    {
        return $this->belongsToMany(Mosque::class, 'followers');
    }

    /**
     * Get the mosques followed by the user.
     */
    public function followedMosques(): BelongsToMany
    {
        return $this->belongsToMany(Mosque::class, 'followers')
            ->withTimestamps();
    }

    /**
     * Get the mosques owned by this user for administration.
     */
    public function ownedMosques(): HasMany
    {
        return $this->hasMany(Mosque::class, 'owner_id');
    }

    /**
     * Get the verification requests submitted by the user.
     */
    public function verificationRequests(): HasMany
    {
        return $this->hasMany(VerificationRequest::class);
    }

    /**
     * Get the verification requests reviewed by the user.
     */
    public function reviewedVerificationRequests(): HasMany
    {
        return $this->hasMany(VerificationRequest::class, 'reviewer_id');
    }

    /**
     * Get the community events created by this user.
     */
    public function createdEvents(): HasMany
    {
        return $this->hasMany(Event::class, 'created_by');
    }

    public function createdCampaigns(): HasMany
    {
        return $this->hasMany(Campaign::class, 'created_by');
    }

    public function createdVolunteerOpportunities(): HasMany
    {
        return $this->hasMany(VolunteerOpportunity::class, 'created_by');
    }

    public function campaignDonations(): HasMany
    {
        return $this->hasMany(CampaignDonation::class);
    }

    /**
     * Get notifications belonging to this user.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /**
     * @param  list<string>  $roles
     */
    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function isNormalUser(): bool
    {
        return $this->hasRole(self::ROLE_NORMAL_USER);
    }

    public function isMosqueAdmin(): bool
    {
        return $this->hasRole(self::ROLE_MOSQUE_ADMIN);
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(self::ROLE_SUPER_ADMIN);
    }

    public function isSuspended(): bool
    {
        return $this->account_status === self::STATUS_SUSPENDED;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'suspended_at' => 'datetime',
        ];
    }
}
