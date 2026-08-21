<?php

namespace App\Models;

use Database\Factories\MosqueFacilityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'mosque_id',
    'facility_key',
])]
class MosqueFacility extends Model
{
    /** @use HasFactory<MosqueFacilityFactory> */
    use HasFactory;

    public const WOMEN_AREA = 'women_area';

    public const CHILD_CARE = 'child_care';

    public const WUDU = 'wudu';

    public const PARKING = 'parking';

    public const AC = 'ac';

    public const WHEELCHAIR = 'wheelchair';

    public const QURAN_CLASS = 'quran_class';

    public const LIBRARY = 'library';

    public const KEYS = [
        self::WOMEN_AREA,
        self::CHILD_CARE,
        self::WUDU,
        self::PARKING,
        self::AC,
        self::WHEELCHAIR,
        self::QURAN_CLASS,
        self::LIBRARY,
    ];

    /**
     * Get the mosque this facility belongs to.
     */
    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }
}
