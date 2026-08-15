<?php

namespace Database\Factories;

use App\Models\Mosque;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Mosque>
 */
class MosqueFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company().' Mosque',
            'address' => fake()->address(),
            'latitude' => fake()->latitude(-90, 90),
            'longitude' => fake()->longitude(-180, 180),
            'phone' => fake()->optional()->numerify('+1555#######'),
            'description' => fake()->optional()->paragraph(),
            'verification_status' => Mosque::VERIFICATION_UNVERIFIED,
        ];
    }
}
