<?php

namespace App\Models;

use App\Support\EidSeason;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

#[Fillable(['key', 'value', 'updated_by'])]
class SystemSetting extends Model
{
    public const DEFAULTS = [
        'maintenance_notice' => '',
        'claims_enabled' => true,
        'reports_enabled' => true,
        // {eid, expected_date, show_from}, see App\Support\EidSeason.
        'eid_season' => null,
    ];

    public const PUBLIC_CACHE_KEY = 'system-settings.public';

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * Every known setting: the defaults overlaid with the stored values.
     *
     * @return array<string, mixed>
     */
    public static function allValues(): array
    {
        $stored = self::query()
            ->whereIn('key', array_keys(self::DEFAULTS))
            ->pluck('value', 'key')
            ->all();

        $values = [...self::DEFAULTS, ...$stored];

        if (is_array($values['eid_season'] ?? null)) {
            $values['eid_season'] = EidSeason::normalise($values['eid_season']) ?? $values['eid_season'];
        }

        return $values;
    }

    /**
     * The settings anyone may read, cached briefly because every page load asks.
     *
     * @return array{maintenance_notice: string, claims_enabled: bool, reports_enabled: bool, eid_season: ?array}
     */
    public static function publicValues(): array
    {
        return Cache::remember(self::PUBLIC_CACHE_KEY, 60, function (): array {
            $values = self::allValues();

            return [
                'maintenance_notice' => trim((string) $values['maintenance_notice']),
                'claims_enabled' => (bool) $values['claims_enabled'],
                'reports_enabled' => (bool) $values['reports_enabled'],
                'eid_season' => EidSeason::current(),
            ];
        });
    }

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
