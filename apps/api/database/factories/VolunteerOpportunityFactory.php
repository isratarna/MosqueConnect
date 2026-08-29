<?php

namespace Database\Factories;

use App\Models\Mosque;
use App\Models\User;
use App\Models\VolunteerOpportunity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VolunteerOpportunity>
 */
class VolunteerOpportunityFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mosque_id' => Mosque::factory(),
            'created_by' => User::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'opportunity_date' => now()->addWeek()->toDateString(),
            'start_time' => '09:00',
            'end_time' => '12:00',
            'location' => fake()->address(),
            'volunteers_required' => 5,
            'requirements' => fake()->sentence(),
            'status' => VolunteerOpportunity::STATUS_ACTIVE,
        ];
    }

    public function active(): static
    {
        return $this->state(fn (): array => [
            'status' => VolunteerOpportunity::STATUS_ACTIVE,
            'opportunity_date' => now()->addDay()->toDateString(),
        ]);
    }
}
