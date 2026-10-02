<?php

namespace Database\Factories;

use App\Models\Complaint;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Complaint>
 */
class ComplaintFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mosque_id' => Mosque::factory(),
            'user_id' => User::factory(),
            'category' => fake()->randomElement(Complaint::CATEGORIES),
            'subject' => fake()->sentence(4),
            'body' => fake()->paragraph(),
            'is_anonymous' => false,
            'status' => Complaint::STATUS_OPEN,
        ];
    }
}
