<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\MosqueDailyStat;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MosqueInsightsTest extends TestCase
{
    use RefreshDatabase;

    private const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

    public function test_track_events_increment_todays_counters_without_storing_visitors(): void
    {
        $mosque = Mosque::factory()->create();

        $this->track($mosque, 'view')->assertNoContent();
        $this->track($mosque, 'view')->assertNoContent();
        $this->track($mosque, 'directions')->assertNoContent();
        $this->track($mosque, 'call')->assertNoContent();

        $this->assertDatabaseCount('mosque_daily_stats', 1);
        $this->assertDatabaseHas('mosque_daily_stats', [
            'mosque_id' => $mosque->id,
            'date' => MosqueDailyStat::today(),
            'profile_views' => 2,
            'direction_clicks' => 1,
            'call_clicks' => 1,
        ]);
    }

    public function test_track_accepts_form_encoded_beacons(): void
    {
        $mosque = Mosque::factory()->create();

        $this->call('POST', "/api/mosques/{$mosque->id}/track", ['event' => 'directions'], [], [], [
            'HTTP_USER_AGENT' => self::BROWSER,
            'CONTENT_TYPE' => 'application/x-www-form-urlencoded',
        ])->assertNoContent();

        $this->assertSame(1, MosqueDailyStat::query()->value('direction_clicks'));
    }

    public function test_track_rejects_unknown_events_and_unknown_mosques(): void
    {
        $mosque = Mosque::factory()->create();

        $this->track($mosque, 'share')->assertUnprocessable();
        $this->postJson('/api/mosques/999999/track', ['event' => 'view'], ['User-Agent' => self::BROWSER])->assertNotFound();
        $this->assertDatabaseCount('mosque_daily_stats', 0);
    }

    public function test_track_skips_bots_and_requests_without_a_user_agent(): void
    {
        $mosque = Mosque::factory()->create();

        foreach (['Googlebot/2.1 (+http://www.google.com/bot.html)', 'facebookexternalhit/1.1', 'curl/8.4.0', ''] as $agent) {
            $this->postJson("/api/mosques/{$mosque->id}/track", ['event' => 'view'], ['User-Agent' => $agent])->assertNoContent();
        }

        $this->assertDatabaseCount('mosque_daily_stats', 0);
    }

    public function test_track_is_limited_to_thirty_events_per_hour_per_ip_and_mosque(): void
    {
        $mosque = Mosque::factory()->create();
        $other = Mosque::factory()->create();

        for ($i = 0; $i < 30; $i++) {
            $this->track($mosque, 'view')->assertNoContent();
        }

        $this->track($mosque, 'view')->assertTooManyRequests();
        $this->track($other, 'view')->assertNoContent();
        $this->assertSame(30, MosqueDailyStat::query()->where('mosque_id', $mosque->id)->value('profile_views'));
    }

    public function test_follow_and_unfollow_are_counted(): void
    {
        $mosque = Mosque::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/mosques/{$mosque->id}/follow")->assertCreated();
        $this->postJson("/api/mosques/{$mosque->id}/follow")->assertStatus(409);
        $this->deleteJson("/api/mosques/{$mosque->id}/follow")->assertOk();
        $this->deleteJson("/api/mosques/{$mosque->id}/follow")->assertNotFound();

        $this->assertDatabaseHas('mosque_daily_stats', [
            'mosque_id' => $mosque->id,
            'follows' => 1,
            'unfollows' => 1,
        ]);
    }

    public function test_insights_return_a_daily_series_and_totals_for_the_range(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-02 06:00:00', 'UTC'));
        [, $mosque] = $this->actingAsMosqueAdmin();
        Follower::factory()->count(3)->create(['mosque_id' => $mosque->id]);

        MosqueDailyStat::query()->create(['mosque_id' => $mosque->id, 'date' => '2026-10-02', 'profile_views' => 12, 'direction_clicks' => 4, 'follows' => 2]);
        MosqueDailyStat::query()->create(['mosque_id' => $mosque->id, 'date' => '2026-09-03', 'profile_views' => 5, 'unfollows' => 1]);
        MosqueDailyStat::query()->create(['mosque_id' => $mosque->id, 'date' => '2026-09-02', 'profile_views' => 100]);
        MosqueDailyStat::query()->create(['mosque_id' => Mosque::factory()->create()->id, 'date' => '2026-10-02', 'profile_views' => 50]);

        $this->getJson("/api/admin/mosques/{$mosque->id}/insights?range=30d")
            ->assertOk()
            ->assertJsonPath('data.range', '30d')
            ->assertJsonPath('data.from', '2026-09-03')
            ->assertJsonPath('data.to', '2026-10-02')
            ->assertJsonCount(30, 'data.series')
            ->assertJsonPath('data.series.0.profile_views', 5)
            ->assertJsonPath('data.series.29.profile_views', 12)
            ->assertJsonPath('data.series.15.profile_views', 0)
            ->assertJsonPath('data.totals.profile_views', 17)
            ->assertJsonPath('data.totals.direction_clicks', 4)
            ->assertJsonPath('data.totals.follows', 2)
            ->assertJsonPath('data.totals.unfollows', 1)
            ->assertJsonPath('data.totals.net_follows', 1)
            ->assertJsonPath('data.totals.followers_count', 3);

        $this->getJson("/api/admin/mosques/{$mosque->id}/insights?range=7d")
            ->assertOk()
            ->assertJsonCount(7, 'data.series')
            ->assertJsonPath('data.totals.profile_views', 12);

        $this->getJson("/api/admin/mosques/{$mosque->id}/insights?range=1y")->assertUnprocessable();

        Carbon::setTestNow();
    }

    public function test_insights_report_announcement_reach_from_follower_notifications(): void
    {
        [, $mosque] = $this->actingAsMosqueAdmin();
        $readers = Follower::factory()->count(4)->create(['mosque_id' => $mosque->id]);

        $announcement = $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Eid jamaat schedule',
            'body' => 'First jamaat at 7:00 AM.',
            'urgency' => 'medium',
            'status' => 'published',
        ])->assertCreated()->json('data.id');

        Notification::query()
            ->where('reference_id', $announcement)
            ->whereIn('user_id', $readers->take(3)->pluck('user_id'))
            ->update(['is_read' => true]);
        Announcement::factory()->create(['mosque_id' => $mosque->id, 'status' => Announcement::STATUS_DRAFT]);

        $this->getJson("/api/admin/mosques/{$mosque->id}/insights")
            ->assertOk()
            ->assertJsonCount(1, 'data.announcements')
            ->assertJsonPath('data.announcements.0.id', $announcement)
            ->assertJsonPath('data.announcements.0.delivered', 4)
            ->assertJsonPath('data.announcements.0.read', 3)
            ->assertJsonPath('data.announcements.0.read_rate', 75)
            ->assertJsonPath('data.totals.announcement_read_rate', 75);
    }

    public function test_only_the_mosques_admin_can_view_its_insights(): void
    {
        [, $mosque] = $this->actingAsMosqueAdmin();

        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]));
        $this->getJson("/api/admin/mosques/{$mosque->id}/insights")->assertForbidden();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/admin/mosques/{$mosque->id}/insights")->assertForbidden();

        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]));
        $this->getJson("/api/admin/mosques/{$mosque->id}/insights")->assertOk();
    }

    private function track(Mosque $mosque, string $event)
    {
        return $this->postJson("/api/mosques/{$mosque->id}/track", ['event' => $event], ['User-Agent' => self::BROWSER]);
    }

    /**
     * @return array{0: User, 1: Mosque}
     */
    private function actingAsMosqueAdmin(): array
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        return [$admin, $mosque];
    }
}
