<?php

namespace App\Models;

use Database\Factories\GoodsDonationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'mosque_id',
    'user_id',
    'announcement_id',
    'item_name',
    'quantity',
    'condition',
    'delivery_method',
    'preferred_date',
    'contact',
    'notes',
    'status',
    'handled_by',
])]
class GoodsDonation extends Model
{
    /** @use HasFactory<GoodsDonationFactory> */
    use HasFactory;

    /** Matches the "Item condition" select in SupportForm.jsx. */
    public const CONDITIONS = ['new', 'gently_used', 'used'];

    /** Matches the "Delivery method" select in SupportForm.jsx. */
    public const DELIVERY_METHODS = ['drop_off', 'pickup', 'discuss'];

    public const STATUS_PENDING = 'pending';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_RECEIVED = 'received';

    public const STATUS_DECLINED = 'declined';

    public const STATUSES = [self::STATUS_PENDING, self::STATUS_ACCEPTED, self::STATUS_RECEIVED, self::STATUS_DECLINED];

    /** Where a pledge may go next. Received and declined are final. */
    private const STATUS_TRANSITIONS = [
        self::STATUS_PENDING => [self::STATUS_ACCEPTED, self::STATUS_RECEIVED, self::STATUS_DECLINED],
        self::STATUS_ACCEPTED => [self::STATUS_RECEIVED, self::STATUS_DECLINED],
    ];

    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::STATUS_TRANSITIONS[$this->status] ?? [], true);
    }

    protected function casts(): array
    {
        return [
            'preferred_date' => 'date',
        ];
    }
}
