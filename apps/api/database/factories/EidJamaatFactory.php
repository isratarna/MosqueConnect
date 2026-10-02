<?php

namespace Database\Factories;

use App\Models\EidJamaat;
use App\Models\Mosque;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EidJamaat>
 */
class EidJamaatFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mosque_id' => Mosque::factory(),
            'eid' => EidJamaat::EID_ADHA,
            'year' => 2027,
            'date' => '2027-05-17',
            'jamaat_time' => '07:30:00',
            'sequence' => 1,
            'location_name' => null,
            'latitude' => null,
            'longitude' => null,
            'khutbah_language' => 'Bangla',
            'women_arrangement' => false,
            'notes' => null,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn (): array => ['published_at' => now()]);
    }
}
