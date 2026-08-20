<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startHour = fake()->numberBetween(6, 20);
        $startTime = sprintf('%02d:00', $startHour);

        return [
            'mosque_id' => Mosque::factory(),
            'created_by' => User::factory(),
            'title' => fake()->sentence(5),
            'description' => fake()->paragraph(),
            'category' => fake()->randomElement(Event::CATEGORIES),
            'event_date' => fake()->dateTimeBetween('now', '+2 months')->format('Y-m-d'),
            'start_time' => $startTime,
            'end_time' => sprintf('%02d:00', $startHour + 2),
            'location' => fake()->streetAddress(),
            'capacity' => fake()->optional()->numberBetween(0, 500),
            'registration_required' => fake()->boolean(),
            'status' => Event::STATUS_DRAFT,
        ];
    }

    public function published(): static
    {
        return $this->state(fn (): array => [
            'status' => Event::STATUS_PUBLISHED,
        ]);
    }
}
