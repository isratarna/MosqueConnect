<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['event_id', 'user_id', 'status', 'checked_in_at', 'ticket_code', 'occurrence_date'])]
class EventRegistration extends Model
{
    public const STATUS_REGISTERED = 'registered';

    public const STATUS_ATTENDED = 'attended';

    public const STATUS_WAITLISTED = 'waitlisted';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_REGISTERED,
        self::STATUS_ATTENDED,
        self::STATUS_WAITLISTED,
        self::STATUS_CANCELLED,
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
            'occurrence_date' => 'date:Y-m-d',
        ];
    }
}
