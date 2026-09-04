<?php

namespace Database\Factories;

use App\Models\Announcement;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Announcement>
 */
class AnnouncementFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mosque_id' => Mosque::factory(),
            'created_by' => User::factory(),
            'title' => fake()->sentence(6),
            'body' => fake()->paragraph(),
            'urgency' => Announcement::URGENCY_LOW,
            'status' => Announcement::STATUS_DRAFT,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn (): array => [
            'status' => Announcement::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);
    }
}
