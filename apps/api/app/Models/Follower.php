<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Follower extends Model
{
    /**
     * Get the user who follows a mosque.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the mosque followed by the user.
     */
    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }
}
