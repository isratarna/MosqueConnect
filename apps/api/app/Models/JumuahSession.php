<?php

namespace App\Models;

use Database\Factories\JumuahSessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'mosque_id',
    'sequence',
    'label',
    'khutbah_time',
    'jamaat_time',
    'notes',
])]
class JumuahSession extends Model
{
    /** @use HasFactory<JumuahSessionFactory> */
    use HasFactory;

    /**
     * Get the mosque hosting this Jumuah session.
     */
    public function mosque(): BelongsTo
    {
        return $this->belongsTo(Mosque::class);
    }
}
