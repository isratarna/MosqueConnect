<?php

namespace App\Http\Resources;

use App\Models\EidJamaat;
use App\Support\ClockTime;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin EidJamaat
 */
class EidJamaatResource extends JsonResource
{
    public function __construct($resource, private readonly ?float $distanceKm = null)
    {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $ownLocation = $this->hasOwnLocation();
        $mosqueLoaded = $this->relationLoaded('mosque');

        $payload = [
            'id' => $this->id,
            'mosque_id' => $this->mosque_id,
            'eid' => $this->eid,
            'eid_label' => EidJamaat::EID_LABELS[$this->eid] ?? $this->eid,
            'year' => $this->year,
            'date' => $this->date?->toDateString(),
            'jamaat_time' => ClockTime::format($this->jamaat_time),
            'sequence' => $this->sequence,
            'location_name' => $this->location_name,
            // A jamaat without its own coordinates is held at the mosque.
            'at_mosque' => ! $ownLocation,
            'latitude' => $ownLocation ? (float) $this->latitude : ($mosqueLoaded ? (float) $this->mosque->latitude : null),
            'longitude' => $ownLocation ? (float) $this->longitude : ($mosqueLoaded ? (float) $this->mosque->longitude : null),
            'khutbah_language' => $this->khutbah_language,
            'women_arrangement' => $this->women_arrangement,
            'notes' => $this->notes,
            'published' => $this->isPublished(),
            'published_at' => $this->published_at?->toJSON(),
            'mosque' => $this->whenLoaded('mosque', fn (): array => [
                'id' => $this->mosque->id,
                'name' => $this->mosque->name,
                'address' => $this->mosque->address,
                'verification_status' => $this->mosque->verification_status,
            ]),
        ];

        if ($this->distanceKm !== null) {
            $payload['distance_km'] = round($this->distanceKm, 3);
        }

        return $payload;
    }
}
