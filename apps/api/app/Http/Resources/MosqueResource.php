<?php

namespace App\Http\Resources;

use App\Models\PrayerTime;
use App\Support\ClockTime;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MosqueResource extends JsonResource
{
    public function __construct($resource, private readonly bool $detailed = false, private readonly ?float $distanceKm = null)
    {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $payload = [
            'id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'latitude' => (float) $this->latitude,
            'longitude' => (float) $this->longitude,
            'phone' => $this->phone,
            'description' => $this->description,
            'verification_status' => $this->verification_status,

            'facilities' => $this->whenLoaded('facilities', fn (): array => $this->facilities
                ->pluck('facility_key')
                ->sortBy(function ($facility) {
                    return array_search($facility, [
                        'ac',
                        'parking',
                        'women_area',
                        'wudu',
                        'child_care',
                        'wheelchair',
                        'quran_class',
                        'library',
                    ]);
                })
                ->values()
                ->all(), []),

            'prayer' => $this->whenLoaded('prayerTimes', fn (): array => $this->prayerSummary(), []),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];

        if ($this->distanceKm !== null) {
            $payload['distance_km'] = round($this->distanceKm, 3);
        }

        if ($this->detailed) {
            $payload['prayer_schedule'] = $this->whenLoaded('prayerTimes', fn (): array => $this->prayerTimes
                ->map(fn ($time): array => [
                    'prayer' => $time->prayer,
                    'label' => $time->label(),
                    'adhan_time' => ClockTime::format($time->adhan_time),
                    'jamaat_time' => ClockTime::format($time->jamaat_time),
                ])
                ->values()
                ->all(), []);
            $payload['jumuah_sessions'] = $this->whenLoaded('jumuahSessions', fn (): array => $this->jumuahSessions
                ->map(fn ($session): array => [
                    'id' => $session->id,
                    'sequence' => $session->sequence,
                    'label' => $session->label,
                    'khutbah_time' => ClockTime::format($session->khutbah_time),
                    'jamaat_time' => ClockTime::format($session->jamaat_time),
                    'notes' => $session->notes,
                ])
                ->values()
                ->all(), []);
            $payload['announcements'] = $this->whenLoaded('publishedAnnouncements', fn (): array => AnnouncementResource::collection($this->publishedAnnouncements)->resolve(), []);
        }

        return $payload;
    }

    /**
     * @return array<string, string>
     */
    private function prayerSummary(): array
    {
        $summary = [];

        foreach ($this->prayerTimes as $time) {
            $label = PrayerTime::PRAYER_LABELS[$time->prayer] ?? null;
            $jamaat = ClockTime::format($time->jamaat_time);

            if ($label && $jamaat) {
                $summary[$label] = $jamaat;
            }
        }

        return $summary;
    }
}
