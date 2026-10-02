<?php

namespace Database\Factories;

use App\Models\LostFoundItem;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LostFoundItem>
 */
class LostFoundItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mosque_id' => Mosque::factory(),
            'user_id' => User::factory(),
            'type' => fake()->randomElement(LostFoundItem::TYPES),
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'category' => fake()->randomElement(LostFoundItem::CATEGORIES),
            'occurred_on' => today()->subDays(2)->toDateString(),
            'location_note' => 'Near the shoe rack',
            'contact_phone' => '01700000000',
            'status' => LostFoundItem::STATUS_OPEN,
            'moderation_status' => LostFoundItem::MODERATION_APPROVED,
        ];
    }
}
