<?php

namespace Database\Factories;

use App\Models\PrayerSchedulePeriod;
use App\Models\RamadanTiming;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RamadanTiming>
 */
class RamadanTimingFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'period_id' => PrayerSchedulePeriod::factory(),
            'date' => now()->addMonth()->toDateString(),
            'sehri_ends' => '04:45:00',
            'iftar' => '18:05:00',
            'taraweeh_time' => '20:15:00',
        ];
    }
}
