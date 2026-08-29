<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'mosque_id',
    'document_path',
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
