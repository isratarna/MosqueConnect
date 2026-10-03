<?php

namespace App\Http\Resources;

use App\Models\Mosque;
use App\Support\ClockTime;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrayerScheduleResource extends JsonResource
{
    /** @param list<array<string, mixed>>|null $computedSchedule */
    public function __construct(Mosque $resource, private readonly ?array $computedSchedule = null, private readonly ?string $date = null, private readonly ?array $period = null)
    {
        parent::__construct($resource);
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $schedule = $this->computedSchedule ?? $this->resource->prayerTimes
            ->map(fn ($time): array => [
                'id' => $time->id,
                'prayer' => $time->prayer,
                'label' => $time->label(),
                'adhan_time' => ClockTime::format($time->adhan_time),
                'jamaat_time' => ClockTime::format($time->jamaat_time),
            ])
            ->values()
            ->all();

        $data = ['mosque_id' => $this->resource->id];
        if ($this->date !== null) {
            $data['date'] = $this->date;
        }
        $data['period'] = $this->period;
        $data['prayer_schedule'] = $schedule;
        $data['jumuah_sessions'] = $this->resource->jumuahSessions
            ->map(fn ($session): array => [
                'id' => $session->id,
                'sequence' => $session->sequence,
                'label' => $session->label,
                'khutbah_time' => ClockTime::format($session->khutbah_time),
                'jamaat_time' => ClockTime::format($session->jamaat_time),
                'notes' => $session->notes,
            ])
            ->values()
            ->all();

        return $data;
    }
}
