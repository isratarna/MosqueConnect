<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['period_id', 'date', 'sehri_ends', 'iftar', 'taraweeh_time'])]
class RamadanTiming extends Model
{
    /** @use HasFactory<RamadanTimingFactory> */
    use HasFactory;

    public function period(): BelongsTo
    {
        return $this->belongsTo(PrayerSchedulePeriod::class, 'period_id');
    }

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d'];
    }
}
