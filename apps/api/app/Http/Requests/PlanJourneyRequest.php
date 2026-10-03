<?php

namespace App\Http\Requests;

use App\Models\MosqueFacility;
use App\Support\Geo;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class PlanJourneyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $corridor = config('journey.plan.corridor_km');
        $duration = config('journey.plan.prayer_duration_min');

        return [
            'origin' => ['required', 'array'],
            'origin.lat' => ['required', 'numeric', 'between:-90,90'],
            'origin.lng' => ['required', 'numeric', 'between:-180,180'],
            'origin.label' => ['nullable', 'string', 'max:120'],
            'destination' => ['required', 'array'],
            'destination.lat' => ['required', 'numeric', 'between:-90,90'],
            'destination.lng' => ['required', 'numeric', 'between:-180,180'],
            'destination.label' => ['nullable', 'string', 'max:120'],
            'depart_at' => ['nullable', 'date'],
            'mode' => ['sometimes', Rule::in(array_keys(config('journey.plan.modes')))],
            'corridor_km' => ['sometimes', 'numeric', "between:{$corridor['min']},{$corridor['max']}"],
            'facilities' => ['sometimes', 'array'],
            'facilities.*' => ['string', Rule::in(MosqueFacility::KEYS)],
            'prayer_duration_min' => ['sometimes', 'integer', "between:{$duration['min']},{$duration['max']}"],
        ];
    }

    /**
     * Extra check: departure past-e na, origin ar destination alada, ar hete
     * gele trip ta chhoto.
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $errors = $validator->errors();

            if (! $errors->has('depart_at') && $this->filled('depart_at') && CarbonImmutable::parse($this->input('depart_at'))->lessThan(now()->subMinutes(5))) {
                $errors->add('depart_at', 'The departure time cannot be in the past.');
            }

            // Coordinate thik na thakle durotto mapa jay na.
            if ($errors->hasAny(['origin.lat', 'origin.lng', 'destination.lat', 'destination.lng', 'origin', 'destination'])) {
                return;
            }

            $km = Geo::distanceKm(
                (float) $this->input('origin.lat'),
                (float) $this->input('origin.lng'),
                (float) $this->input('destination.lat'),
                (float) $this->input('destination.lng'),
            );

            if ($km < 0.2) {
                $validator->errors()->add('destination', 'The destination must be different from the starting point.');
            }

            $walkMax = (int) config('journey.plan.walk_max_km', 15);
            if ($this->input('mode') === 'walk' && $km > $walkMax) {
                $validator->errors()->add('mode', "Walking plans are limited to trips under {$walkMax} km.");
            }
        }];
    }

    /**
     * Default diye bhora, planner-e pathanor moto shape.
     *
     * @return array<string, mixed>
     */
    public function plannerInput(): array
    {
        $timezone = config('prayer.timezone');
        $departAt = $this->filled('depart_at')
            ? CarbonImmutable::parse($this->input('depart_at'))->setTimezone($timezone)
            : CarbonImmutable::now($timezone);

        // 5 min ager porjonto allow kori, kintu plan ta ekhon theke shuru.
        if ($departAt->lessThan(CarbonImmutable::now($timezone))) {
            $departAt = CarbonImmutable::now($timezone);
        }

        $point = fn (string $key): array => [
            'lat' => (float) $this->input("{$key}.lat"),
            'lng' => (float) $this->input("{$key}.lng"),
            'label' => $this->input("{$key}.label"),
        ];

        $facilities = array_values(array_unique($this->input('facilities', [])));
        sort($facilities);

        return [
            'origin' => $point('origin'),
            'destination' => $point('destination'),
            'depart_at' => $departAt,
            'mode' => $this->input('mode', 'drive'),
            'corridor_km' => (float) $this->input('corridor_km', config('journey.plan.corridor_km.default')),
            'facilities' => $facilities,
            'prayer_duration_min' => (int) $this->input('prayer_duration_min', config('journey.plan.prayer_duration_min.default')),
        ];
    }
}
