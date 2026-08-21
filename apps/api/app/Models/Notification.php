<?php

namespace App\Models;

use Database\Factories\NotificationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'mosque_id',
    'type',
    'title',
    'message',
    'reference_type',
    'reference_id',
    'is_read',
])]
class Notification extends Model
{
    /** @use HasFactory<NotificationFactory> */
    use HasFactory;

    public const TYPE_EVENT = 'event';

    public const TYPE_ANNOUNCEMENT = 'announcement';

    public const TYPE_PRAYER_SCHEDULE = 'prayer_schedule';

    public const TYPE_CAMPAIGN = 'campaign';

    public const TYPE_SYSTEM = 'system';

    public const TYPES = [
        self::TYPE_EVENT,
        self::TYPE_ANNOUNCEMENT,
        self::TYPE_PRAYER_SCHEDULE,
        self::TYPE_CAMPAIGN,
        self::TYPE_SYSTEM,
    ];

    /**
     * Get the notification recipient.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the mosque that produced the notification.
     */
    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reference_id' => 'integer',
            'is_read' => 'boolean',
        ];
    }
}
