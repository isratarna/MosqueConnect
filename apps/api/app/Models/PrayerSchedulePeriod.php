<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['mosque_id', 'name', 'starts_on', 'ends_on', 'is_ramadan'])]
class PrayerSchedulePeriod extends Model
{
    /** @use HasFactory<PrayerSchedulePeriodFactory> */
    use HasFactory;

    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function prayerTimes(): HasMany
    {
        return $this->hasMany(PrayerTime::class, 'period_id')->orderByRaw(
            "CASE prayer WHEN 'fajr' THEN 1 WHEN 'dhuhr' THEN 2 WHEN 'asr' THEN 3 WHEN 'maghrib' THEN 4 WHEN 'isha' THEN 5 ELSE 6 END",
        );
    }

    public function ramadanTimings(): HasMany
    {
        return $this->hasMany(RamadanTiming::class, 'period_id')->orderBy('date');
    }

    /**
     * Short period description embedded in prayer schedule responses so the
     * UI can label a timetable, for example "Ramadan 1448".
     *
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'is_ramadan' => (bool) $this->is_ramadan,
            'starts_on' => $this->starts_on->toDateString(),
            'ends_on' => $this->ends_on->toDateString(),
        ];
    }

    public function covers(string $date): bool
    {
        return $this->starts_on->toDateString() <= $date && $this->ends_on->toDateString() >= $date;
    }

    protected function casts(): array
    {
        return [
            'starts_on' => 'date:Y-m-d',
            'ends_on' => 'date:Y-m-d',
            'is_ramadan' => 'boolean',
        ];
    }
}
