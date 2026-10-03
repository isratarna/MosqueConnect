<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'request_hash',
    'request',
    'response',
    'routing_calls',
    'expires_at',
])]
class JourneyPlan extends Model
{
    // ULID id, tai share link guess kora jay na.
    use HasUlids;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Ekhono cache hishebe use kora jay emon plan. */
    public function scopeFresh(Builder $query): Builder
    {
        return $query->where('expires_at', '>', now());
    }

    protected function casts(): array
    {
        return [
            'request' => 'array',
            'response' => 'array',
            'routing_calls' => 'integer',
            'expires_at' => 'datetime',
        ];
    }
}
