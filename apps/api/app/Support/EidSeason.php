<?php

namespace App\Support;

use App\Models\EidJamaat;
use App\Models\SystemSetting;
use Carbon\CarbonImmutable;

/**
 * The upcoming Eid, as configured by a super admin in the eid_season setting.
 *
 * Eid features appear from the show-from date (two weeks before the expected
 * date unless set otherwise) until a few days after it, since the actual date
 * depends on the moon sighting and Eid-ul-Adha lasts three days.
 */
class EidSeason
{
    public const SETTING_KEY = 'eid_season';

    public const DEFAULT_LEAD_DAYS = 14;

    public const DAYS_AFTER = 3;

    /**
     * @return array{eid: string, label: string, year: int, expected_date: string, show_from: string, ends_on: string, active: bool}|null
     */
    public static function current(): ?array
    {
        $value = SystemSetting::query()->find(self::SETTING_KEY)?->value;

        return is_array($value) ? self::describe($value) : null;
    }

    /**
     * The configured season, but only while it is showing.
     *
     * @return array{eid: string, label: string, year: int, expected_date: string, show_from: string, ends_on: string, active: bool}|null
     */
    public static function active(): ?array
    {
        $season = self::current();

        return $season && $season['active'] ? $season : null;
    }

    /**
     * Normalise a submitted setting into the stored shape.
     *
     * @param  array{eid: string, expected_date: string, show_from?: string|null}|null  $input
     * @return array{eid: string, expected_date: string, show_from: string}|null
     */
    public static function normalise(?array $input): ?array
    {
        if ($input === null) {
            return null;
        }

        $expected = CarbonImmutable::parse($input['expected_date']);

        return [
            'eid' => $input['eid'],
            'expected_date' => $expected->toDateString(),
            'show_from' => filled($input['show_from'] ?? null)
                ? CarbonImmutable::parse($input['show_from'])->toDateString()
                : $expected->subDays(self::DEFAULT_LEAD_DAYS)->toDateString(),
        ];
    }

    /**
     * @param  array<string, mixed>  $value
     * @return array{eid: string, label: string, year: int, expected_date: string, show_from: string, ends_on: string, active: bool}|null
     */
    private static function describe(array $value): ?array
    {
        if (! in_array($value['eid'] ?? null, EidJamaat::EIDS, true) || empty($value['expected_date'])) {
            return null;
        }

        $normalised = self::normalise($value);
        $expected = CarbonImmutable::parse($normalised['expected_date']);
        $endsOn = $expected->addDays(self::DAYS_AFTER)->toDateString();
        $today = CarbonImmutable::now(config('prayer.timezone'))->toDateString();

        return [
            'eid' => $normalised['eid'],
            'label' => EidJamaat::EID_LABELS[$normalised['eid']],
            'year' => $expected->year,
            'expected_date' => $normalised['expected_date'],
            'show_from' => $normalised['show_from'],
            'ends_on' => $endsOn,
            'active' => $today >= $normalised['show_from'] && $today <= $endsOn,
        ];
    }
}
