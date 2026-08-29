<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['key', 'value', 'updated_by'])]
class SystemSetting extends Model
{
    public const DEFAULTS = [
        'maintenance_notice' => '',
        'claims_enabled' => true,
        'reports_enabled' => true,
        'auto_publish_verified_mosques' => true,
    ];

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    protected function casts(): array
    {
        return [
            'value' => 'json',
        ];
    }
}
