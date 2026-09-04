<?php

namespace Database\Factories;

use App\Models\BloodRequest;
use App\Models\BloodRequestResponse;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BloodRequestResponse>
 */
class BloodRequestResponseFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'blood_request_id' => BloodRequest::factory(),
            'user_id' => User::factory(),
            'message' => fake()->sentence(),
        ];
    }
}
