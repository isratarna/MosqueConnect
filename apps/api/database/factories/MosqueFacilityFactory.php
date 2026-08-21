<?php

namespace Database\Factories;

use App\Models\Mosque;
use App\Models\MosqueFacility;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MosqueFacility>
 */
class MosqueFacilityFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mosque_id' => Mosque::factory(),
            'facility_key' => MosqueFacility::WUDU,
        ];
    }
}
