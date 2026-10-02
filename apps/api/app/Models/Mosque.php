<?php

namespace App\Models;

use App\Support\TextSearch;
use Database\Factories\MosqueFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name',
    'address',
    'district',
    'area',
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

    /** @var list<string> */
    protected $appends = ['photo_url'];

    protected static function booted(): void
    {
        // owner_id is kept for compatibility. Whenever it points at someone,
        // that person is an owner on the mosque's team, so every place that
        // still sets owner_id (claim approval, seeders, tests) keeps working.
        static::saved(function (Mosque $mosque): void {
            if (! $mosque->owner_id || ! ($mosque->wasRecentlyCreated || $mosque->wasChanged('owner_id'))) {
                return;
            }

            $member = MosqueMember::query()->firstOrNew([
                'mosque_id' => $mosque->id,
                'user_id' => $mosque->owner_id,
            ]);

            if ($member->exists && $member->isOwner() && $member->isAccepted()) {
                return;
            }

            $member->fill([
                'role' => MosqueMember::ROLE_OWNER,
                'accepted_at' => $member->accepted_at ?? now(),
            ])->save();
        });
    }

    /**
     * Get the user assigned to administer this mosque.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get the mosque's team: accepted members and pending invitations.
     */
    public function members(): HasMany
    {
        return $this->hasMany(MosqueMember::class);
    }

    /**
     * Get corrections to this mosque suggested by the community.
     */
    public function editSuggestions(): HasMany
    {
        return $this->hasMany(MosqueEditSuggestion::class);
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

    /** Get fundraising campaigns belonging to the mosque. */
    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    /**
     * Get notifications generated for followers of this mosque.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function contentReports(): HasMany
    {
        return $this->hasMany(ContentReport::class, 'reportable_id')
            ->where('reportable_type', 'mosque');
    }

    /**
     * Get daily prayer and jamaat times for the mosque.
     */
    public function prayerTimes(): HasMany
    {
        return $this->hasMany(PrayerTime::class)->orderByRaw(
            "CASE prayer WHEN 'fajr' THEN 1 WHEN 'dhuhr' THEN 2 WHEN 'asr' THEN 3 WHEN 'maghrib' THEN 4 WHEN 'isha' THEN 5 ELSE 6 END",
        );
    }

    /**
     * Get Jumuah sessions hosted by the mosque.
     */
    public function jumuahSessions(): HasMany
    {
        return $this->hasMany(JumuahSession::class)->orderBy('sequence');
    }

    /**
     * Get Eid jamaats held by the mosque, in the order they take place.
     */
    public function eidJamaats(): HasMany
    {
        return $this->hasMany(EidJamaat::class)
            ->orderBy('date')
            ->orderBy('jamaat_time')
            ->orderBy('sequence');
    }

    /**
     * Get announcements published by the mosque.
     */
    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class);
    }

    public function volunteerOpportunities(): HasMany
    {
        return $this->hasMany(VolunteerOpportunity::class);
    }

    /**
     * Lost and found items posted at this mosque.
     */
    public function lostFoundItems(): HasMany
    {
        return $this->hasMany(LostFoundItem::class);
    }

    /**
     * Private feedback sent to this mosque.
     */
    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class);
    }

    /**
     * Pledges of goods made to this mosque.
     */
    public function goodsDonations(): HasMany
    {
        return $this->hasMany(GoodsDonation::class);
    }

    /**
     * Match a search term against the name, address, area and district.
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        return TextSearch::apply($query, ['name', 'address'], $term, ['area', 'district']);
    }

    /**
     * Get published announcements for public mosque profiles.
     */
    public function publishedAnnouncements(): HasMany
    {
        return $this->announcements()
            ->published()
            ->orderByDesc('published_at')
            ->orderByDesc('id');
    }

    /**
     * Get facilities available at the mosque.
     */
    public function facilities(): HasMany
    {
        return $this->hasMany(MosqueFacility::class)->orderBy('facility_key');
    }

    /**
     * Get the mosque's anonymous daily usage counters.
     */
    public function dailyStats(): HasMany
    {
        return $this->hasMany(MosqueDailyStat::class);
    }

    /**
     * Public URL of the uploaded cover photo, versioned so a new upload is not served from cache.
     */
    public function getPhotoUrlAttribute(): ?string
    {
        if (! $this->photo_path) {
            return null;
        }

        return url("/api/mosques/{$this->id}/photo").'?v='.substr(md5($this->photo_path), 0, 8);
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
