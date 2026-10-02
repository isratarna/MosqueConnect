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
        [$district, $area] = fake()->randomElement([
            ['Dhaka', 'Gulshan'],
            ['Dhaka', 'Dhanmondi'],
            ['Dhaka', 'Paltan'],
            ['Chattogram', 'Nasirabad'],
        ]);

        return [
            'name' => fake()->company().' Mosque',
            'address' => fake()->address(),
            'district' => $district,
            'area' => $area,
            'latitude' => fake()->latitude(-90, 90),
            'longitude' => fake()->longitude(-180, 180),
            'phone' => fake()->optional()->numerify('+1555#######'),
            'description' => fake()->optional()->paragraph(),
            'verification_status' => Mosque::VERIFICATION_UNVERIFIED,
        ];
    }
}
