<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
