<?php

namespace App\Models;

use Database\Factories\LostFoundItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'mosque_id',
    'user_id',
    'type',
    'title',
    'description',
    'category',
    'occurred_on',
    'location_note',
    'contact_phone',
    'status',
    'moderation_status',
    'moderation_note',
])]
class LostFoundItem extends Model
{
    /** @use HasFactory<LostFoundItemFactory> */
    use HasFactory;

    public const TYPE_LOST = 'lost';

    public const TYPE_FOUND = 'found';

    public const TYPES = [self::TYPE_LOST, self::TYPE_FOUND];

    public const CATEGORIES = ['phone', 'wallet', 'keys', 'bag', 'clothing', 'shoes', 'documents', 'other'];

    public const STATUS_OPEN = 'open';

    public const STATUS_RETURNED = 'returned';

    public const STATUS_CLOSED = 'closed';

    public const STATUSES = [self::STATUS_OPEN, self::STATUS_RETURNED, self::STATUS_CLOSED];

    public const MODERATION_PENDING = 'pending';

    public const MODERATION_APPROVED = 'approved';

    public const MODERATION_REJECTED = 'rejected';

    /** Open items are closed automatically after this many days. */
    public const AUTO_CLOSE_DAYS = 30;

    /** @var list<string> */
    protected $appends = ['photo_url'];

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
            ->where('reportable_type', 'lost_found');
    }

    /**
     * Items anyone may see: not rejected or held back by moderation.
     */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('moderation_status', self::MODERATION_APPROVED);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        if (! $this->photo_path) {
            return null;
        }

        return url("/api/lost-found/{$this->id}/photo").'?v='.substr(md5($this->photo_path), 0, 8);
    }

    protected function casts(): array
    {
        return [
            'occurred_on' => 'date',
        ];
    }
}
