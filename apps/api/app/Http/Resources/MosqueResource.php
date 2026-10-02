<?php

namespace App\Http\Resources;

use App\Services\PrayerScheduleService;
use App\Support\ClockTime;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

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
        $schedule = $this->relationLoaded('prayerTimes')
            ? app(PrayerScheduleService::class)->forDate($this->resource)
            : null;

        $payload = [
            'id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'district' => $this->district,
            'area' => $this->area,
            'photo_url' => $this->photo_url,
            'rating' => $this->rating_avg === null ? null : (float) $this->rating_avg,
            'reviews_count' => (int) ($this->reviews_count ?? 0),
            'has_admin' => $this->owner_id !== null,
            'latitude' => (float) $this->latitude,
            'longitude' => (float) $this->longitude,
            'phone' => $this->phone,
            'whatsapp' => $this->whatsapp,
            'email' => $this->email,
            'website_url' => $this->website_url,
            'facebook_url' => $this->facebook_url,
            'description' => $this->description,
            'capacity' => $this->capacity,
            'established_year' => $this->established_year,
            'khutbah_language' => $this->khutbah_language,
            'women_facility_notes' => $this->women_facility_notes,
            'accessibility_notes' => $this->accessibility_notes,
            'schedule_updated_at' => $this->scheduleUpdatedAt(),
            'followers_count' => (int) ($this->followers_count ?? 0),
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

            'prayer' => $schedule === null ? [] : $this->prayerSummary($schedule, 'jamaat_time'),
            'prayer_sources' => $schedule === null ? [] : $this->prayerSummary($schedule, 'source'),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];

        $distanceKm = $this->distanceKm ?? $this->resource->getAttribute('distance_km');
        if ($distanceKm !== null) {
            $payload['distance_km'] = round((float) $distanceKm, 3);
        }

        if ($this->detailed) {
            $payload['prayer_schedule'] = array_map(
                fn (array $entry): array => array_diff_key($entry, ['id' => true]),
                $schedule ?? [],
            );
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
            $payload['photos'] = $this->whenLoaded('photos', fn (): array => MosquePhotoResource::collection($this->photos)->resolve(), []);
            $payload['announcements'] = $this->whenLoaded('publishedAnnouncements', fn (): array => AnnouncementResource::collection($this->publishedAnnouncements)->resolve(), []);
            $payload['announcements_count'] = (int) ($this->announcements_count ?? 0);
            $payload['upcoming_events_count'] = (int) ($this->upcoming_events_count ?? 0);
            $payload['active_campaigns_count'] = (int) ($this->active_campaigns_count ?? 0);
            $payload['eid_jamaats'] = $this->whenLoaded('eidJamaats', fn (): array => $this->eidJamaats
                ->map(fn ($jamaat): array => (new EidJamaatResource($jamaat->setRelation('mosque', $this->resource)))->resolve())
                ->values()
                ->all(), []);
        }

        return $payload;
    }

    /**
     * Map each prayer label to one field of its schedule entry.
     *
     * @param  list<array<string, mixed>>  $schedule
     * @return array<string, string>
     */
    private function prayerSummary(array $schedule, string $field): array
    {
        $summary = [];

        foreach ($schedule as $entry) {
            if (filled($entry[$field] ?? null)) {
                $summary[$entry['label']] = $entry[$field];
            }
        }

        return $summary;
    }

    private function scheduleUpdatedAt(): ?string
    {
        $updatedAt = collect([
            $this->prayer_times_max_updated_at,
            $this->jumuah_sessions_max_updated_at,
        ])->filter()->max();

        return $updatedAt === null ? null : Carbon::parse($updatedAt)->toJSON();
    }
}
