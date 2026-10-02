<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VolunteerApplication>
 */
class VolunteerApplicationFactory extends Factory
{
    protected $model = VolunteerApplication::class;

    public function definition(): array
    {
        return [
            'volunteer_opportunity_id' => VolunteerOpportunity::factory()->create()->id,
            'user_id' => User::factory()->create()->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn () => ['status' => VolunteerApplication::STATUS_PENDING]);
    }

    public function accepted(): static
    {
        return $this->state(fn () => ['status' => VolunteerApplication::STATUS_ACCEPTED]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => ['status' => VolunteerApplication::STATUS_REJECTED]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => ['status' => VolunteerApplication::STATUS_CANCELLED]);
    }
}
