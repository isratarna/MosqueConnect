<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\PrayerTime;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MosqueListingFieldsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_district_and_area_but_other_users_cannot(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'district' => 'Dhaka',
            'area' => 'Gulshan',
        ])->assertOk()
            ->assertJsonPath('mosque.district', 'Dhaka')
            ->assertJsonPath('mosque.area', 'Gulshan');

        Sanctum::actingAs(User::factory()->create());
        $this->patchJson("/api/admin/mosques/{$mosque->id}", ['district' => 'Chattogram'])
            ->assertForbidden();
    }

    public function test_listing_fields_are_returned_on_profile_and_nearby_responses(): void
    {
        $mosque = Mosque::factory()->create([
            'latitude' => 23.75,
            'longitude' => 90.40,
            'district' => 'Dhaka',
            'area' => 'Gulshan',
            'photo_path' => 'mosque-photos/test/cover.jpg',
        ]);
        DB::table('mosques')->where('id', $mosque->id)->update(['rating_avg' => 4.5, 'reviews_count' => 7]);
        foreach (PrayerTime::PRAYERS as $index => $prayer) {
            PrayerTime::factory()->create([
                'mosque_id' => $mosque->id,
                'prayer' => $prayer,
                'adhan_time' => sprintf('%02d:00:00', 4 + $index),
                'jamaat_time' => sprintf('%02d:15:00', 4 + $index),
            ]);
        }

        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('data.rating', 4.5)
            ->assertJsonPath('data.reviews_count', 7)
            ->assertJsonPath('data.district', 'Dhaka')
            ->assertJsonPath('data.area', 'Gulshan')
            ->assertJsonPath('data.photo_url', $mosque->photo_url)
            ->assertJsonPath('data.has_admin', false);

        $this->getJson('/api/mosques/nearby?latitude=23.75&longitude=90.40')
            ->assertOk()
            ->assertJsonPath('data.0.rating', 4.5)
            ->assertJsonPath('data.0.reviews_count', 7)
            ->assertJsonPath('data.0.district', 'Dhaka')
            ->assertJsonPath('data.0.area', 'Gulshan')
            ->assertJsonPath('data.0.has_admin', false);

        $this->getJson("/api/mosques/{$mosque->id}/prayer-schedule")
            ->assertOk()
            ->assertJsonPath('data.mosque_id', $mosque->id)
            ->assertJsonCount(5, 'data.prayer_schedule')
            ->assertJsonPath('data.prayer_schedule.0.prayer', PrayerTime::PRAYER_FAJR);
    }

    public function test_admin_prayer_schedule_uses_the_shared_schedule_shape(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        foreach (PrayerTime::PRAYERS as $index => $prayer) {
            PrayerTime::factory()->create([
                'mosque_id' => $mosque->id,
                'prayer' => $prayer,
                'adhan_time' => sprintf('%02d:00:00', 4 + $index),
                'jamaat_time' => sprintf('%02d:15:00', 4 + $index),
            ]);
        }
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$mosque->id}/prayer-schedule")
            ->assertOk()
            ->assertJsonPath('data.mosque_id', $mosque->id)
            ->assertJsonCount(5, 'data.prayer_schedule')
            ->assertJsonPath('data.prayer_schedule.0.prayer', PrayerTime::PRAYER_FAJR)
            ->assertJsonPath('data.jumuah_sessions', []);
    }

    public function test_location_backfill_preserves_existing_values_and_parses_null_values(): void
    {
        $mosque = Mosque::factory()->create([
            'address' => 'Road 63, Gulshan 2, Dhaka 1212, Bangladesh',
            'district' => null,
            'area' => null,
        ]);
        $existing = Mosque::factory()->create([
            'address' => 'Some Road, Banani, Dhaka, Bangladesh',
            'district' => 'Custom District',
            'area' => null,
        ]);
        $oldDhaka = Mosque::factory()->create([
            'address' => 'Chawkbazar Road, Old Dhaka 1211, Bangladesh',
            'district' => null,
            'area' => null,
        ]);
        $migration = require base_path('database/migrations/2026_10_03_000200_add_mosque_rating_fields_and_backfill_locations.php');

        $migration->down();
        $migration->up();

        $this->assertDatabaseHas('mosques', ['id' => $mosque->id, 'district' => 'Dhaka', 'area' => 'Gulshan 2']);
        $this->assertDatabaseHas('mosques', ['id' => $existing->id, 'district' => 'Custom District', 'area' => 'Banani']);
        $this->assertDatabaseHas('mosques', ['id' => $oldDhaka->id, 'district' => 'Dhaka', 'area' => 'Old Dhaka']);
    }
}
