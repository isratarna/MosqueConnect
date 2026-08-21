<?php

namespace App\Models;

use Database\Factories\PrayerTimeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'mosque_id',
    'prayer',
    'adhan_time',
    'jamaat_time',
])]
class PrayerTime extends Model
{
    /** @use HasFactory<PrayerTimeFactory> */
    use HasFactory;

    public const PRAYER_FAJR = 'fajr';

    public const PRAYER_DHUHR = 'dhuhr';

    public const PRAYER_ASR = 'asr';

    public const PRAYER_MAGHRIB = 'maghrib';

    public const PRAYER_ISHA = 'isha';

    public const PRAYERS = [
        self::PRAYER_FAJR,
        self::PRAYER_DHUHR,
        self::PRAYER_ASR,
        self::PRAYER_MAGHRIB,
        self::PRAYER_ISHA,
    ];

    public const PRAYER_LABELS = [
        self::PRAYER_FAJR => 'Fajr',
        self::PRAYER_DHUHR => 'Dhuhr',
        self::PRAYER_ASR => 'Asr',
        self::PRAYER_MAGHRIB => 'Maghrib',
        self::PRAYER_ISHA => 'Isha',
    ];

    /**
     * Get the mosque this prayer time belongs to.
     */
    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function label(): string
    {
        return self::PRAYER_LABELS[$this->prayer] ?? $this->prayer;
    }
}
