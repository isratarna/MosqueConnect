<?php

namespace App\Models;

use Database\Factories\FollowerFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Follower extends Model
{
    /** @use HasFactory<FollowerFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'mosque_id',
    ];

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
