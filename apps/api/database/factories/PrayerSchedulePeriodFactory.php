<?php

namespace Database\Factories;

use App\Models\Mosque;
use App\Models\PrayerSchedulePeriod;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PrayerSchedulePeriod>
 */
class PrayerSchedulePeriodFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startsOn = now()->addMonth()->startOfDay();

        return [
            'mosque_id' => Mosque::factory(),
            'name' => 'Schedule period',
            'starts_on' => $startsOn->toDateString(),
            'ends_on' => $startsOn->copy()->addDays(29)->toDateString(),
            'is_ramadan' => false,
        ];
    }

    public function ramadan(): static
    {
        return $this->state(fn (array $attributes): array => [
            'name' => 'Ramadan '.($this->faker->numberBetween(1440, 1460)),
            'is_ramadan' => true,
        ]);
    }
}
