<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['sender_id', 'title', 'message', 'audience', 'audience_value', 'link', 'recipients_count', 'sent_at'])]
class Broadcast extends Model
{
    public const AUDIENCE_ALL = 'all';

    public const AUDIENCE_ROLE = 'role';

    public const AUDIENCE_DISTRICT = 'district';

    public const AUDIENCES = [self::AUDIENCE_ALL, self::AUDIENCE_ROLE, self::AUDIENCE_DISTRICT];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * Active accounts that should receive the broadcast. A district means the
     * people who follow at least one mosque there.
     *
     * @return Builder<User>
     */
    public function recipients(): Builder
    {
        return User::query()
            ->where('account_status', User::STATUS_ACTIVE)
            ->when($this->audience === self::AUDIENCE_ROLE, fn (Builder $query) => $query->where('role', $this->audience_value))
            ->when($this->audience === self::AUDIENCE_DISTRICT, fn (Builder $query) => $query->whereHas(
                'followedMosques',
                fn (Builder $query) => $query->whereRaw('LOWER(mosques.district) = ?', [mb_strtolower((string) $this->audience_value)]),
            ));
    }

    protected function casts(): array
    {
        return [
            'recipients_count' => 'integer',
            'sent_at' => 'datetime',
        ];
    }
}
