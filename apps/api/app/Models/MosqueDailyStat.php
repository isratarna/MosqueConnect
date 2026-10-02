<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Anonymous per-day counters for one mosque. No per-visitor data is stored.
 */
#[Fillable([
    'mosque_id',
    'date',
    'profile_views',
    'direction_clicks',
    'call_clicks',
    'follows',
    'unfollows',
])]
class MosqueDailyStat extends Model
{
    public const COUNTERS = [
        'profile_views',
        'direction_clicks',
        'call_clicks',
        'follows',
        'unfollows',
    ];

    /** Public track events and the counter each one increments. */
    public const TRACK_EVENTS = [
        'view' => 'profile_views',
        'directions' => 'direction_clicks',
        'call' => 'call_clicks',
    ];

    public $timestamps = false;

    /**
     * Add one to a counter on today's row, creating the row if needed.
     */
    public static function record(int $mosqueId, string $counter): void
    {
        if (! in_array($counter, self::COUNTERS, true)) {
            throw new InvalidArgumentException("Unknown mosque stat counter [{$counter}].");
        }

        $row = array_fill_keys(self::COUNTERS, 0);
        $row[$counter] = 1;

        static::query()->upsert(
            [['mosque_id' => $mosqueId, 'date' => self::today(), ...$row]],
            ['mosque_id', 'date'],
            [$counter => DB::raw("{$counter} + 1")],
        );
    }

    /**
     * Today's date in the community's timezone, so a day matches the admin's day.
     */
    public static function today(): string
    {
        return CarbonImmutable::now(config('prayer.timezone'))->toDateString();
    }

    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'profile_views' => 'integer',
            'direction_clicks' => 'integer',
            'call_clicks' => 'integer',
            'follows' => 'integer',
            'unfollows' => 'integer',
        ];
    }
}
