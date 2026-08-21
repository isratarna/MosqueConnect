<?php

namespace Database\Factories;

use App\Models\JumuahSession;
use App\Models\Mosque;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JumuahSession>
 */
class JumuahSessionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mosque_id' => Mosque::factory(),
            'sequence' => 1,
            'label' => 'First Jumuah',
            'khutbah_time' => '12:45:00',
            'jamaat_time' => '13:15:00',
            'notes' => 'Main prayer hall',
        ];
    }
}
