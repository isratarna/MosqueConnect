<?php

namespace Database\Factories;

use App\Models\MosqueFacility;
use App\Models\MosqueSuggestion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<MosqueSuggestion> */
class MosqueSuggestionFactory extends Factory
{
    protected $model = MosqueSuggestion::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->company().' Mosque',
            'address' => fake()->streetAddress().', Dhaka, Bangladesh',
            'district' => 'Dhaka',
            'area' => fake()->randomElement(['Gulshan', 'Dhanmondi', 'Paltan']),
            'latitude' => 23.75,
            'longitude' => 90.40,
            'phone' => null,
            'facilities' => [MosqueFacility::WOMEN_AREA],
            'notes' => null,
            'status' => MosqueSuggestion::STATUS_PENDING,
        ];
    }
}
