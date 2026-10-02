<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'name', 'email', 'subject', 'message', 'status'])]
class ContactMessage extends Model
{
    public const STATUS_NEW = 'new';

    public const STATUS_READ = 'read';

    public const STATUS_REPLIED = 'replied';

    public const STATUS_ARCHIVED = 'archived';

    public const STATUSES = [self::STATUS_NEW, self::STATUS_READ, self::STATUS_REPLIED, self::STATUS_ARCHIVED];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
