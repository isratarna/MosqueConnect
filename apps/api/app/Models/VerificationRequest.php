<?php

namespace App\Models;

use Database\Factories\VerificationRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'user_id',
    'mosque_id',
    'document_path',
    'role_at_mosque',
    'verification_reason',
    'active_claim_key',
    'status',
    'ai_score',
    'ai_result',
    'reviewer_id',
    'review_note',
    'submitted_at',
    'reviewed_at',
])]
class VerificationRequest extends Model
{
    /** @use HasFactory<VerificationRequestFactory> */
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_AI_REVIEWED = 'ai_reviewed';

    public const STATUS_UNDER_HUMAN_REVIEW = 'under_human_review';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_AI_REVIEWED,
        self::STATUS_UNDER_HUMAN_REVIEW,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
    ];

    /**
     * Statuses that are still in-flight; a request in one of these states
     * blocks a new active request for the same user or mosque.
     */
    public const ACTIVE_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_AI_REVIEWED,
        self::STATUS_UNDER_HUMAN_REVIEW,
    ];

    protected static function booted(): void
    {
        static::creating(function (self $request): void {
            if ($request->active_claim_key === null
                && ! $request->isFinalized()
                && $request->user_id !== null
                && $request->mosque_id !== null) {
                $request->active_claim_key = self::activeClaimKeyFor($request->user_id, $request->mosque_id);
            }
        });

        static::updating(function (self $request): void {
            if ($request->isFinalized()) {
                $request->active_claim_key = null;
            }
        });
    }

    /**
     * Whether the claim has been finalized (approved or rejected).
     */
    public function isFinalized(): bool
    {
        return in_array($this->status, [self::STATUS_APPROVED, self::STATUS_REJECTED], true);
    }

    /**
     * The distinct value that flags an open claim for a given (user, mosque) pair.
     */
    public static function activeClaimKeyFor(int $userId, int $mosqueId): string
    {
        return "{$userId}:{$mosqueId}";
    }

    /**
     * Determine the public status a mosque admin applicant should see for a claim.
     *
     * Intermediate review states are surfaced as "pending" so the applicant only
     * ever sees pending, approved, or rejected.
     */
    public function publicStatus(): string
    {
        return match ($this->status) {
            self::STATUS_APPROVED => 'approved',
            self::STATUS_REJECTED => 'rejected',
            default => 'pending',
        };
    }

    /**
     * Get the user who submitted the verification request.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the mosque being verified.
     */
    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    /**
     * Get the user who reviewed the verification request.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function applicantClaims(): HasMany
    {
        return $this->hasMany(self::class, 'user_id', 'user_id')
            ->latest('submitted_at');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ai_score' => 'decimal:2',
            'ai_result' => 'array',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }
}
