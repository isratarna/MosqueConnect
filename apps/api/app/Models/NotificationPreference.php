<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'announcement',
    'event',
    'campaign',
    'prayer_schedule',
    'blood',
    'push_enabled',
    'email_digest',
])]
class NotificationPreference extends Model
{
    public const COLUMN_BY_TYPE = [
        Notification::TYPE_ANNOUNCEMENT => 'announcement',
        Notification::TYPE_EVENT => 'event',
        Notification::TYPE_CAMPAIGN => 'campaign',
        Notification::TYPE_PRAYER_SCHEDULE => 'prayer_schedule',
        Notification::TYPE_BLOOD => 'blood',
    ];

    public const DEFAULTS = [
        'announcement' => true,
        'event' => true,
        'campaign' => true,
        'prayer_schedule' => true,
        'blood' => true,
        'push_enabled' => false,
        'email_digest' => true,
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'announcement' => 'boolean',
            'event' => 'boolean',
            'campaign' => 'boolean',
            'prayer_schedule' => 'boolean',
            'blood' => 'boolean',
            'push_enabled' => 'boolean',
            'email_digest' => 'boolean',
        ];
    }
}
