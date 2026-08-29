<?php

namespace Database\Factories;

use App\Models\Mosque;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VerificationRequest>
 */
class VerificationRequestFactory extends Factory
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
            'document_path' => 'verification/test-proof.pdf',
            'role_at_mosque' => 'Committee Member',
            'verification_reason' => 'I am responsible for the daily operation of this mosque.',
            'status' => VerificationRequest::STATUS_PENDING,
            'submitted_at' => now(),
        ];
    }
}
