<?php

namespace Database\Factories;

use App\Models\GoodsDonation;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GoodsDonation>
 */
class GoodsDonationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mosque_id' => Mosque::factory(),
            'user_id' => User::factory(),
            'item_name' => fake()->randomElement(['Prayer mats', 'Rice', 'Winter blankets', 'Quran copies']),
            'quantity' => (string) fake()->numberBetween(1, 20),
            'condition' => fake()->randomElement(GoodsDonation::CONDITIONS),
            'delivery_method' => fake()->randomElement(GoodsDonation::DELIVERY_METHODS),
            'preferred_date' => today()->addDays(3)->toDateString(),
            'contact' => '01700000000',
            'status' => GoodsDonation::STATUS_PENDING,
        ];
    }
}
