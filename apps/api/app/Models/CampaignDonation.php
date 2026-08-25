<?php

namespace App\Models;

use Database\Factories\CampaignDonationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'campaign_id', 'user_id', 'confirmed_by', 'donor_name', 'contact', 'amount',
    'payment_method', 'reference', 'message', 'is_anonymous', 'status', 'confirmed_at',
])]
class CampaignDonation extends Model
{
    /** @use HasFactory<CampaignDonationFactory> */
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_REJECTED = 'rejected';

    public const STATUSES = [self::STATUS_PENDING, self::STATUS_CONFIRMED, self::STATUS_REJECTED];

    public const METHOD_CASH = 'cash';

    public const METHOD_BANK_TRANSFER = 'bank_transfer';

    public const METHOD_MOBILE_BANKING = 'mobile_banking';

    public const METHOD_OTHER = 'other';

    public const PAYMENT_METHODS = [
        self::METHOD_CASH,
        self::METHOD_BANK_TRANSFER,
        self::METHOD_MOBILE_BANKING,
        self::METHOD_OTHER,
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'is_anonymous' => 'boolean',
            'confirmed_at' => 'datetime',
        ];
    }
}
