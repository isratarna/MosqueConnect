<?php

namespace Database\Factories;

use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CampaignDonation> */
class CampaignDonationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'campaign_id' => Campaign::factory(),
            'user_id' => User::factory(),
            'donor_name' => fake()->name(),
            'contact' => fake()->phoneNumber(),
            'amount' => fake()->randomFloat(2, 100, 10000),
            'payment_method' => CampaignDonation::METHOD_CASH,
            'is_anonymous' => false,
            'status' => CampaignDonation::STATUS_PENDING,
        ];
    }
}
