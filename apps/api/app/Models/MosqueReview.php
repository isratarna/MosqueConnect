<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['mosque_id', 'user_id', 'rating', 'comment', 'moderation_status'])]
class MosqueReview extends Model
{
    public const MODERATION_APPROVED = 'approved';

    public const MODERATION_HIDDEN = 'hidden';

    public const MODERATION_STATUSES = [self::MODERATION_APPROVED, self::MODERATION_HIDDEN];

    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contentReports(): HasMany
    {
        return $this->hasMany(ContentReport::class, 'reportable_id')
            ->where('reportable_type', 'review');
    }
}
