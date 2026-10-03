<?php

namespace App\Http\Resources;

use App\Models\PrayerSchedulePeriod;
use App\Support\ClockTime;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PrayerSchedulePeriod
 */
class PrayerSchedulePeriodResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...$this->resource->summary(),
            'mosque_id' => $this->mosque_id,
            'prayer_times' => $this->whenLoaded('prayerTimes', fn (): array => $this->prayerTimes
                ->map(fn ($time): array => [
                    'id' => $time->id,
                    'prayer' => $time->prayer,
                    'label' => $time->label(),
                    'adhan_time' => ClockTime::format($time->adhan_time),
                    'jamaat_time' => ClockTime::format($time->jamaat_time),
                ])
                ->values()
                ->all(), []),
            'ramadan_timings' => $this->whenLoaded('ramadanTimings', fn (): array => $this->ramadanTimings
                ->map(fn ($timing): array => [
                    'id' => $timing->id,
                    'date' => $timing->date->toDateString(),
                    'sehri_ends' => substr((string) $timing->sehri_ends, 0, 5),
                    'iftar' => substr((string) $timing->iftar, 0, 5),
                    'taraweeh_time' => $timing->taraweeh_time === null ? null : substr((string) $timing->taraweeh_time, 0, 5),
                ])
                ->values()
                ->all(), []),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
