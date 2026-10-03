<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\Event;
use App\Models\Follower;
use App\Models\JumuahSession;
use App\Models\Mosque;
use App\Models\PrayerTime;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MosqueProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_includes_contact_counts_freshness_and_only_five_latest_announcements(): void
    {
        $mosque = Mosque::factory()->create();
        Follower::factory()->count(2)->create(['mosque_id' => $mosque->id]);
        $jumuahUpdatedAt = now()->subHour()->startOfSecond();
        foreach (PrayerTime::PRAYERS as $index => $prayer) {
            PrayerTime::factory()->create([
                'mosque_id' => $mosque->id,
                'prayer' => $prayer,
                'adhan_time' => sprintf('%02d:00:00', 4 + $index),
                'jamaat_time' => sprintf('%02d:15:00', 4 + $index),
                'updated_at' => now()->subHours(2),
            ]);
        }
        $mosque->jumuahSessions()->create([
            'sequence' => 1,
            'label' => 'Jumuah',
            'jamaat_time' => '13:00:00',
            'updated_at' => $jumuahUpdatedAt,
        ]);
        foreach (range(1, 6) as $index) {
            Announcement::factory()->published()->create([
                'mosque_id' => $mosque->id,
                'title' => "Profile notice {$index}",
                'published_at' => now()->subMinutes(10 - $index),
            ]);
        }
        Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'event_date' => today()->addDays(3),
        ]);
        Campaign::factory()->active()->create([
            'mosque_id' => $mosque->id,
            'starts_on' => today()->subDay(),
            'ends_on' => today()->addDays(10),
        ]);

        $response = $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('data.followers_count', 2)
            ->assertJsonCount(5, 'data.announcements')
            ->assertJsonPath('data.announcements_count', 6)
            ->assertJsonPath('data.upcoming_events_count', 1)
            ->assertJsonPath('data.active_campaigns_count', 1)
            ->assertJsonPath('data.announcements.0.title', 'Profile notice 6');

        $expectedFreshness = max(
            PrayerTime::query()->where('mosque_id', $mosque->id)->max('updated_at'),
            JumuahSession::query()->where('mosque_id', $mosque->id)->max('updated_at'),
        );
        $this->assertNotNull($response->json('data.schedule_updated_at'));
        $this->assertSame(
            Carbon::parse($expectedFreshness, config('app.timezone'))->utc()->format('Y-m-d H:i:s'),
            Carbon::parse($response->json('data.schedule_updated_at'))->utc()->format('Y-m-d H:i:s'),
        );
    }

    public function test_admin_can_update_contact_and_about_fields(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'whatsapp' => '+8801712345678',
            'email' => 'info@example.org',
            'website_url' => 'https://example.org',
            'facebook_url' => 'https://facebook.com/example',
            'capacity' => 800,
            'established_year' => 1980,
            'khutbah_language' => 'Bengali',
            'women_facility_notes' => 'Separate entrance',
            'accessibility_notes' => 'Ramp at the east entrance',
        ])->assertOk()
            ->assertJsonPath('mosque.whatsapp', '+8801712345678')
            ->assertJsonPath('mosque.capacity', 800)
            ->assertJsonPath('mosque.established_year', 1980);

        $this->assertDatabaseHas('mosques', [
            'id' => $mosque->id,
            'website_url' => 'https://example.org',
            'accessibility_notes' => 'Ramp at the east entrance',
        ]);
    }

    public function test_public_mosque_announcements_are_paginated_and_validate_page_size(): void
    {
        $mosque = Mosque::factory()->create();
        foreach (range(1, 12) as $index) {
            Announcement::factory()->published()->create([
                'mosque_id' => $mosque->id,
                'published_at' => now()->subMinutes($index),
            ]);
        }

        $this->getJson("/api/mosques/{$mosque->id}/announcements")
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 12)
            ->assertJsonPath('meta.per_page', 10);

        $this->getJson("/api/mosques/{$mosque->id}/announcements?per_page=100")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
    }
}
