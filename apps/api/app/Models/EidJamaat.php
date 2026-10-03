<?php

namespace App\Models;

use Database\Factories\EidJamaatFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'mosque_id',
    'eid',
    'year',
    'date',
    'jamaat_time',
    'sequence',
    'location_name',
    'latitude',
    'longitude',
    'khutbah_language',
    'women_arrangement',
    'notes',
    'published_at',
])]
class EidJamaat extends Model
{
    /** @use HasFactory<EidJamaatFactory> */
    use HasFactory;

    public const EID_FITR = 'fitr';

    public const EID_ADHA = 'adha';

    public const EIDS = [
        self::EID_FITR,
        self::EID_ADHA,
    ];

    public const EID_LABELS = [
        self::EID_FITR => 'Eid-ul-Fitr',
        self::EID_ADHA => 'Eid-ul-Adha',
    ];

    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->whereNotNull('published_at');
    }

    public function scopeForSeason(Builder $query, string $eid, int $year): Builder
    {
        return $query->where('eid', $eid)->where('year', $year);
    }

    public function isPublished(): bool
    {
        return $this->published_at !== null;
    }

    /**
     * Whether the jamaat is held away from the mosque building.
     */
    public function hasOwnLocation(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'date' => 'date:Y-m-d',
            'sequence' => 'integer',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'women_arrangement' => 'boolean',
            'published_at' => 'datetime',
        ];
    }
}
