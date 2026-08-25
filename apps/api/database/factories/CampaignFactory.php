<?php

namespace Database\Factories;

use App\Models\Campaign;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Campaign> */
class CampaignFactory extends Factory
{
    public function definition(): array
    {
        return [
            'mosque_id' => Mosque::factory(),
            'created_by' => User::factory(),
            'title' => fake()->sentence(5),
            'summary' => fake()->sentence(12),
            'description' => fake()->paragraphs(3, true),
            'category' => fake()->randomElement(Campaign::CATEGORIES),
            'target_amount' => fake()->randomFloat(2, 10000, 1000000),
            'raised_amount' => 0,
            'currency' => 'BDT',
            'starts_on' => today(),
            'ends_on' => today()->addMonth(),
            'status' => Campaign::STATUS_DRAFT,
        ];
    }

    public function active(): static
    {
        return $this->state(fn (): array => ['status' => Campaign::STATUS_ACTIVE]);
    }
}
