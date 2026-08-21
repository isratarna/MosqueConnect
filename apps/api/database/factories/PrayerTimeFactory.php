<?php

namespace Database\Factories;

use App\Models\Mosque;
use App\Models\PrayerTime;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PrayerTime>
 */
class PrayerTimeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mosque_id' => Mosque::factory(),
            'prayer' => PrayerTime::PRAYER_DHUHR,
            'adhan_time' => '12:05:00',
            'jamaat_time' => '13:15:00',
        ];
    }
}
