<?php

namespace Tests\Feature;

use App\Models\JumuahSession;
use App\Models\Mosque;
use App\Models\PrayerTime;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrayerScheduleManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_endpoint_returns_prayer_schedule_and_jumuah_sessions(): void
    {
        $mosque = Mosque::factory()->create();
        PrayerTime::factory()->create([
            'mosque_id' => $mosque->id,
            'prayer' => PrayerTime::PRAYER_FAJR,
            'adhan_time' => '04:15:00',
            'jamaat_time' => '04:45:00',
        ]);
        $mosque->jumuahSessions()->create([
            'sequence' => 1,
            'label' => 'First Jumuah',
            'khutbah_time' => '12:45:00',
            'jamaat_time' => '13:15:00',
            'notes' => 'Main hall',
        ]);

        $this->getJson("/api/mosques/{$mosque->id}/prayer-schedule")
            ->assertOk()
            ->assertJsonPath('data.mosque_id', $mosque->id)
            ->assertJsonPath('data.prayer_schedule.0.prayer', PrayerTime::PRAYER_FAJR)
            ->assertJsonPath('data.prayer_schedule.0.adhan_time', '04:15')
            ->assertJsonPath('data.jumuah_sessions.0.label', 'First Jumuah');
    }

    public function test_verified_mosque_admin_can_upsert_prayer_schedule(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/mosques/{$mosque->id}/prayer-schedule", [
            'prayer_schedule' => [
                [
                    'prayer' => PrayerTime::PRAYER_FAJR,
                    'adhan_time' => '04:15',
                    'jamaat_time' => '04:45',
                ],
                [
                    'prayer' => PrayerTime::PRAYER_DHUHR,
                    'adhan_time' => '12:30',
                    'jamaat_time' => '13:00',
                ],
            ],
            'jumuah_sessions' => [
                [
                    'sequence' => 1,
                    'label' => 'First Jumuah',
                    'khutbah_time' => '12:45',
                    'jamaat_time' => '13:15',
                    'notes' => 'Main hall',
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('data.mosque_id', $mosque->id)
            ->assertJsonPath('data.prayer_schedule.0.prayer', PrayerTime::PRAYER_FAJR)
            ->assertJsonPath('data.prayer_schedule.1.prayer', PrayerTime::PRAYER_DHUHR)
            ->assertJsonPath('data.jumuah_sessions.0.label', 'First Jumuah');

        $this->assertDatabaseHas('prayer_times', [
            'mosque_id' => $mosque->id,
            'prayer' => PrayerTime::PRAYER_FAJR,
            'adhan_time' => '04:15:00',
            'jamaat_time' => '04:45:00',
        ]);
        $this->assertDatabaseHas('jumuah_sessions', [
            'mosque_id' => $mosque->id,
            'sequence' => 1,
            'label' => 'First Jumuah',
            'jamaat_time' => '13:15:00',
        ]);
    }

    public function test_non_owner_admin_cannot_update_another_mosques_schedule(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $other = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $other->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/mosques/{$mosque->id}/prayer-schedule", [
            'prayer_schedule' => [[
                'prayer' => PrayerTime::PRAYER_FAJR,
                'adhan_time' => '04:10',
                'jamaat_time' => '04:40',
            ]],
        ])->assertForbidden();
    }

    public function test_invalid_time_format_is_rejected(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/mosques/{$mosque->id}/prayer-schedule", [
            'prayer_schedule' => [[
                'prayer' => PrayerTime::PRAYER_FAJR,
                'adhan_time' => 'invalid-time',
                'jamaat_time' => '04:45',
            ]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('prayer_schedule.0.adhan_time');
    }
}
