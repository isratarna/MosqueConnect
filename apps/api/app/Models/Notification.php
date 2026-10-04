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
    'link',
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

    public const TYPE_EID = 'eid';

    public const TYPE_TEAM = 'team';

    public const TYPE_SUGGESTION = 'suggestion';

    public const TYPE_COMPLAINT = 'complaint';

    public const TYPE_GOODS_DONATION = 'goods_donation';

    public const TYPE_BLOOD = 'blood';

    public const TYPE_VOLUNTEER = 'volunteer';

    public const REFERENCE_EVENT = 'event';

    public const REFERENCE_ANNOUNCEMENT = 'announcement';

    public const REFERENCE_PRAYER_SCHEDULE = 'prayer_schedule';

    public const REFERENCE_CAMPAIGN = 'campaign';

    public const REFERENCE_CAMPAIGN_UPDATE = 'campaign_update';

    public const REFERENCE_EID_JAMAAT = 'eid_jamaat';

    public const REFERENCE_MOSQUE_MEMBER = 'mosque_member';

    public const REFERENCE_SUGGESTION = 'mosque_edit_suggestion';

    public const REFERENCE_BROADCAST = 'broadcast';

    public const REFERENCE_COMPLAINT = 'complaint';

    public const REFERENCE_GOODS_DONATION = 'goods_donation';

    public const REFERENCE_VOLUNTEER_APPLICATION = 'volunteer_application';

    public const TYPES = [
        self::TYPE_EVENT,
        self::TYPE_ANNOUNCEMENT,
        self::TYPE_PRAYER_SCHEDULE,
        self::TYPE_CAMPAIGN,
        self::TYPE_SYSTEM,
        self::TYPE_EID,
        self::TYPE_TEAM,
        self::TYPE_SUGGESTION,
        self::TYPE_COMPLAINT,
        self::TYPE_GOODS_DONATION,
        self::TYPE_BLOOD,
        self::TYPE_VOLUNTEER,
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
