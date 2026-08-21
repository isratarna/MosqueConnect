<?php

namespace Database\Factories;

use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Notification>
 */
class NotificationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'mosque_id' => Mosque::factory(),
            'type' => fake()->randomElement(Notification::TYPES),
            'title' => fake()->sentence(5),
            'message' => fake()->paragraph(),
            'reference_type' => null,
            'reference_id' => null,
            'is_read' => false,
        ];
    }

    public function read(): static
    {
        return $this->state(fn (): array => [
            'is_read' => true,
        ]);
    }
}
