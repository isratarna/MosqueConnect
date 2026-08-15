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

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'phone',
        'role',
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
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [];
    }
}
