<?php

namespace Database\Factories;

use App\Models\BloodRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BloodRequest>
 */
class BloodRequestFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'created_by' => User::factory(),
            'blood_group' => fake()->randomElement(BloodRequest::BLOOD_GROUPS),
            'units' => fake()->numberBetween(1, 5),
            'hospital_or_location' => fake()->company().' Hospital',
            'required_date' => fake()->dateTimeBetween('today', '+7 days')->format('Y-m-d'),
            'urgency' => BloodRequest::URGENCY_HIGH,
            'contact_name' => fake()->name(),
            'contact_phone' => fake()->phoneNumber(),
            'notes' => fake()->sentence(),
            'status' => BloodRequest::STATUS_ACTIVE,
        ];
    }

    public function active(): static
    {
        return $this->state(fn (): array => ['status' => BloodRequest::STATUS_ACTIVE]);
    }

    public function completed(): static
    {
        return $this->state(fn (): array => [
            'status' => BloodRequest::STATUS_COMPLETED,
            'closed_at' => now(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (): array => [
            'status' => BloodRequest::STATUS_CANCELLED,
            'closed_at' => now(),
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn (): array => [
            'status' => BloodRequest::STATUS_CLOSED,
            'closed_at' => now(),
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn (): array => [
            'status' => BloodRequest::STATUS_EXPIRED,
            'closed_at' => now(),
        ]);
    }
}
