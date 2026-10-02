<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Follower;
use App\Models\JumuahSession;
use App\Models\Mosque;
use App\Models\MosqueFacility;
use App\Models\Notification;
use App\Models\PrayerTime;
use App\Models\User;
use App\Models\VerificationRequest;
use App\Services\DashboardQueryService;
use App\Services\PrayerScheduleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_mosque_admin_can_view_their_mosque_dashboard(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'mosque' => ['id', 'name', 'verification_status', 'verified'],
                    'summary' => [
                        'followers_count',
                        'active_announcements_count',
                        'upcoming_events_count',
                        'active_campaigns_count',
                        'pending_content_reports_count',
                    ],
                    'recent_content',
                    'pending_content_reports',
                ],
            ])
            ->assertJsonPath('data.mosque.id', $mosque->id)
            ->assertJsonPath('data.mosque.verified', true);
    }

    public function test_mosque_dashboard_summarizes_mosque_activity(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        Follower::factory()->count(3)->create(['mosque_id' => $mosque->id]);

        Announcement::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'moderation_status' => Announcement::MODERATION_APPROVED,
        ]);
        Announcement::factory()->create([
            'mosque_id' => $mosque->id,
            'status' => Announcement::STATUS_DRAFT,
            'moderation_status' => Announcement::MODERATION_APPROVED,
        ]);

        Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'event_date' => now()->addDays(2)->format('Y-m-d'),
            'moderation_status' => Event::MODERATION_APPROVED,
        ]);
        Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'event_date' => now()->subDays(2)->format('Y-m-d'),
            'moderation_status' => Event::MODERATION_APPROVED,
        ]);

        Campaign::factory()->active()->create([
            'mosque_id' => $mosque->id,
            'moderation_status' => Campaign::MODERATION_APPROVED,
            'starts_on' => now()->subDay()->format('Y-m-d'),
            'ends_on' => now()->addWeek()->format('Y-m-d'),
        ]);

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonPath('data.summary.followers_count', 3)
            ->assertJsonPath('data.summary.active_announcements_count', 1)
            ->assertJsonPath('data.summary.upcoming_events_count', 1)
            ->assertJsonPath('data.summary.active_campaigns_count', 1)
            ->assertJsonPath('data.summary.pending_content_reports_count', 0);
    }

    public function test_mosque_dashboard_includes_pending_content_reports_for_mosque_content(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $announcement = Announcement::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'moderation_status' => Announcement::MODERATION_APPROVED,
        ]);

        $report = ContentReport::query()->create([
            'reportable_type' => 'announcement',
            'reportable_id' => $announcement->id,
            'category' => 'inaccurate',
            'reason' => 'Wrong prayer time.',
            'status' => ContentReport::STATUS_PENDING,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonPath('data.summary.pending_content_reports_count', 1)
            ->assertJsonPath('data.pending_content_reports.0.id', $report->id)
            ->assertJsonPath('data.pending_content_reports.0.type', 'announcement');
    }

    public function test_mosque_admin_cannot_view_another_mosque_dashboard(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $otherOwner = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $otherMosque = Mosque::factory()->create([
            'owner_id' => $otherOwner->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$otherMosque->id}/dashboard")
            ->assertForbidden();
    }

    public function test_mosque_admin_cannot_view_dashboard_of_unverified_mosque(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_PENDING,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertForbidden();
    }

    public function test_normal_user_cannot_access_mosque_admin_dashboard(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $normal = User::factory()->create();
        Sanctum::actingAs($normal);

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertForbidden();
    }

    public function test_super_admin_can_view_any_mosque_dashboard(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]));

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonPath('data.mosque.id', $mosque->id);
    }

    public function test_super_admin_dashboard_returns_platform_statistics(): void
    {
        $this->actingAsSuperAdmin();

        User::factory()->count(3)->create(['role' => User::ROLE_NORMAL_USER]);
        User::factory()->count(2)->create(['role' => User::ROLE_MOSQUE_ADMIN]);

        Mosque::factory()->create(['verification_status' => Mosque::VERIFICATION_VERIFIED]);
        Mosque::factory()->create(['verification_status' => Mosque::VERIFICATION_VERIFIED]);
        Mosque::factory()->create(['verification_status' => Mosque::VERIFICATION_PENDING]);

        $volunteer = User::factory()->create();
        $pendingMosque = Mosque::factory()->create(['verification_status' => Mosque::VERIFICATION_PENDING]);
        VerificationRequest::query()->create([
            'user_id' => $volunteer->id,
            'mosque_id' => $pendingMosque->id,
            'document_path' => 'verification/proof.pdf',
            'status' => VerificationRequest::STATUS_PENDING,
            'submitted_at' => now(),
        ]);

        $this->getJson('/api/super-admin/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'platform' => [
                        'total_mosques',
                        'verified_mosques_count',
                        'pending_verification_requests_count',
                        'total_registered_users',
                        'pending_moderation_count',
                        'pending_content_reports_count',
                    ],
                    'breakdown' => ['mosques_by_verification_status', 'users_by_role'],
                    'pending_work' => ['verification_requests', 'content_reports'],
                    'recent_admin_activity',
                ],
            ])
            ->assertJsonPath('data.platform.total_mosques', 4)
            ->assertJsonPath('data.platform.verified_mosques_count', 2)
            ->assertJsonPath('data.platform.pending_verification_requests_count', 1);
    }

    public function test_super_admin_dashboard_counts_pending_moderation_and_reports(): void
    {
        $this->actingAsSuperAdmin();

        $mosque = Mosque::factory()->create();
        $announcement = Announcement::factory()->create([
            'mosque_id' => $mosque->id,
            'moderation_status' => Announcement::MODERATION_PENDING,
        ]);
        Event::factory()->create([
            'mosque_id' => $mosque->id,
            'moderation_status' => Event::MODERATION_PENDING,
        ]);
        Campaign::factory()->create([
            'mosque_id' => $mosque->id,
            'moderation_status' => Campaign::MODERATION_PENDING,
        ]);

        ContentReport::query()->create([
            'reportable_type' => 'announcement',
            'reportable_id' => $announcement->id,
            'category' => 'spam',
            'reason' => 'Spam announcement.',
            'status' => ContentReport::STATUS_PENDING,
        ]);
        ContentReport::query()->create([
            'reportable_type' => 'mosque',
            'reportable_id' => $mosque->id,
            'category' => 'other',
            'reason' => 'Outdated info.',
            'status' => ContentReport::STATUS_PENDING,
        ]);

        $this->getJson('/api/super-admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.platform.pending_moderation_count', 3)
            ->assertJsonPath('data.platform.pending_content_reports_count', 2)
            ->assertJsonCount(2, 'data.pending_work.content_reports');
    }

    public function test_super_admin_dashboard_includes_recent_admin_activity(): void
    {
        $superAdmin = $this->actingAsSuperAdmin();
        AdminAuditLog::record($superAdmin, 'claim.approved', Mosque::factory()->create());

        $this->getJson('/api/super-admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.recent_admin_activity.0.action', 'claim.approved')
            ->assertJsonPath('data.recent_admin_activity.0.actor_name', $superAdmin->name);
    }

    public function test_non_super_admin_cannot_access_super_admin_dashboard(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]));

        $this->getJson('/api/super-admin/dashboard')
            ->assertForbidden();
    }

    public function test_unauthenticated_users_cannot_access_dashboards(): void
    {
        $this->getJson('/api/super-admin/dashboard')
            ->assertUnauthorized();

        $mosque = Mosque::factory()->create();
        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertUnauthorized();
    }

    public function test_mosque_dashboard_returns_every_card_section(): void
    {
        [, $mosque] = $this->actingAsMosqueAdmin();

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'mosque' => ['id', 'name', 'district', 'area', 'photo_url'],
                    'summary' => ['followers_count', 'pending_content_reports_count', 'pending_pledges_count'],
                    'recent_content',
                    'pending_content_reports',
                    'today_prayers' => ['date', 'is_friday', 'schedule', 'jumuah_sessions', 'next_jamaat'],
                    'upcoming_events',
                    'active_campaigns',
                    'pending_pledges',
                    'follower_growth',
                    'profile_completeness' => ['percentage', 'items'],
                    'failed_sections',
                ],
            ])
            ->assertJsonPath('data.failed_sections', []);
    }

    public function test_today_prayers_highlight_the_next_jamaat(): void
    {
        // Thursday 1 Oct 2026, 12:00 in Dhaka.
        Carbon::setTestNow(Carbon::parse('2026-10-01 06:00:00', 'UTC'));
        [, $mosque] = $this->actingAsMosqueAdmin();
        $this->publishAllPrayers($mosque);

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonPath('data.today_prayers.date', '2026-10-01')
            ->assertJsonPath('data.today_prayers.is_friday', false)
            ->assertJsonCount(5, 'data.today_prayers.schedule')
            ->assertJsonPath('data.today_prayers.next_jamaat.prayer', 'dhuhr')
            ->assertJsonPath('data.today_prayers.next_jamaat.jamaat_time', '13:15')
            ->assertJsonPath('data.today_prayers.next_jamaat.tomorrow', false);

        // 21:00 in Dhaka, after Isha: the next jamaat is tomorrow's Fajr.
        Carbon::setTestNow(Carbon::parse('2026-10-01 15:00:00', 'UTC'));

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertJsonPath('data.today_prayers.next_jamaat.prayer', 'fajr')
            ->assertJsonPath('data.today_prayers.next_jamaat.tomorrow', true);

        Carbon::setTestNow();
    }

    public function test_jumuah_replaces_dhuhr_as_the_next_jamaat_on_friday(): void
    {
        // Friday 2 Oct 2026, 12:00 in Dhaka.
        Carbon::setTestNow(Carbon::parse('2026-10-02 06:00:00', 'UTC'));
        [, $mosque] = $this->actingAsMosqueAdmin();
        $this->publishAllPrayers($mosque);
        JumuahSession::factory()->create(['mosque_id' => $mosque->id, 'label' => 'First Jumuah', 'jamaat_time' => '13:00:00']);

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonPath('data.today_prayers.is_friday', true)
            ->assertJsonPath('data.today_prayers.next_jamaat.prayer', 'jumuah')
            ->assertJsonPath('data.today_prayers.next_jamaat.label', 'First Jumuah')
            ->assertJsonPath('data.today_prayers.next_jamaat.jamaat_time', '13:00');

        Carbon::setTestNow();
    }

    public function test_upcoming_events_lists_the_next_five_published_events_with_registrations(): void
    {
        [, $mosque] = $this->actingAsMosqueAdmin();

        $first = Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Tafsir night',
            'event_date' => now()->addDay()->format('Y-m-d'),
            'capacity' => 40,
            'registration_required' => true,
        ]);
        foreach (User::factory()->count(3)->create() as $user) {
            EventRegistration::query()->create(['event_id' => $first->id, 'user_id' => $user->id]);
        }
        Event::factory()->published()->count(5)->create([
            'mosque_id' => $mosque->id,
            'event_date' => now()->addDays(10)->format('Y-m-d'),
        ]);
        Event::factory()->create(['mosque_id' => $mosque->id, 'status' => Event::STATUS_DRAFT, 'event_date' => now()->format('Y-m-d')]);
        Event::factory()->published()->create(['mosque_id' => $mosque->id, 'event_date' => now()->subDay()->format('Y-m-d')]);

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonCount(5, 'data.upcoming_events')
            ->assertJsonPath('data.upcoming_events.0.title', 'Tafsir night')
            ->assertJsonPath('data.upcoming_events.0.registrations_count', 3)
            ->assertJsonPath('data.upcoming_events.0.capacity', 40);
    }

    public function test_active_campaigns_show_progress_and_days_left(): void
    {
        [, $mosque] = $this->actingAsMosqueAdmin();
        Campaign::factory()->active()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Roof repair',
            'target_amount' => 1000,
            'raised_amount' => 250,
            'ends_on' => today()->addDays(12),
        ]);
        Campaign::factory()->create(['mosque_id' => $mosque->id, 'status' => Campaign::STATUS_DRAFT]);

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonCount(1, 'data.active_campaigns')
            ->assertJsonPath('data.active_campaigns.0.title', 'Roof repair')
            ->assertJsonPath('data.active_campaigns.0.progress_percentage', 25)
            ->assertJsonPath('data.active_campaigns.0.days_left', 12);
    }

    public function test_pending_pledges_list_only_this_mosques_pending_donations(): void
    {
        [, $mosque] = $this->actingAsMosqueAdmin();
        $campaign = Campaign::factory()->active()->create(['mosque_id' => $mosque->id, 'title' => 'Roof repair']);
        $pending = CampaignDonation::factory()->create(['campaign_id' => $campaign->id, 'donor_name' => 'Karim', 'amount' => 500]);
        CampaignDonation::factory()->create(['campaign_id' => $campaign->id, 'is_anonymous' => true, 'donor_name' => 'Hidden name']);
        CampaignDonation::factory()->create(['campaign_id' => $campaign->id, 'status' => CampaignDonation::STATUS_CONFIRMED]);
        CampaignDonation::factory()->create(['campaign_id' => Campaign::factory()->active()->create()->id]);

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonPath('data.summary.pending_pledges_count', 2)
            ->assertJsonCount(2, 'data.pending_pledges')
            ->assertJsonPath('data.pending_pledges.0.id', $pending->id)
            ->assertJsonPath('data.pending_pledges.0.campaign_id', $campaign->id)
            ->assertJsonPath('data.pending_pledges.0.campaign_title', 'Roof repair')
            ->assertJsonPath('data.pending_pledges.0.donor_name', 'Karim')
            ->assertJsonPath('data.pending_pledges.1.donor_name', null);
    }

    public function test_follower_growth_counts_new_followers_per_week_for_eight_weeks(): void
    {
        [, $mosque] = $this->actingAsMosqueAdmin();
        Follower::factory()->count(2)->create(['mosque_id' => $mosque->id, 'created_at' => now()]);
        Follower::factory()->create(['mosque_id' => $mosque->id, 'created_at' => now()->subDays(8)]);
        Follower::factory()->create(['mosque_id' => $mosque->id, 'created_at' => now()->subDays(55)]);
        Follower::factory()->create(['mosque_id' => $mosque->id, 'created_at' => now()->subDays(70)]);

        $response = $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonCount(8, 'data.follower_growth')
            ->assertJsonPath('data.follower_growth.7.week_end', today()->toDateString())
            ->assertJsonPath('data.follower_growth.7.count', 2)
            ->assertJsonPath('data.follower_growth.6.count', 1)
            ->assertJsonPath('data.follower_growth.0.count', 1);

        $this->assertSame(4, array_sum(array_column($response->json('data.follower_growth'), 'count')));
    }

    public function test_profile_completeness_reports_a_percentage_and_checklist(): void
    {
        [, $mosque] = $this->actingAsMosqueAdmin();
        $mosque->update(['phone' => null, 'description' => 'Neighbourhood mosque']);
        MosqueFacility::query()->create(['mosque_id' => $mosque->id, 'facility_key' => 'wudu']);

        $items = collect($this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonPath('data.profile_completeness.percentage', 43)
            ->json('data.profile_completeness.items'))->pluck('done', 'key');

        $this->assertEquals([
            'photo' => false,
            'phone' => false,
            'description' => true,
            'facilities' => true,
            'prayer_times' => false,
            'location' => true,
            'jumuah' => false,
        ], $items->all());
    }

    public function test_one_failing_dashboard_section_does_not_break_the_others(): void
    {
        [, $mosque] = $this->actingAsMosqueAdmin();
        $this->app->instance(DashboardQueryService::class, new class(app(PrayerScheduleService::class)) extends DashboardQueryService
        {
            public function followerGrowth(Mosque $mosque): array
            {
                throw new RuntimeException('Follower growth query failed.');
            }
        });

        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonPath('data.follower_growth', null)
            ->assertJsonPath('data.failed_sections', ['follower_growth'])
            ->assertJsonPath('data.summary.followers_count', 0)
            ->assertJsonStructure(['data' => ['today_prayers', 'profile_completeness' => ['percentage']]]);
    }

    public function test_mosque_admin_can_set_district_and_area(): void
    {
        [, $mosque] = $this->actingAsMosqueAdmin();

        $this->patchJson("/api/admin/mosques/{$mosque->id}", ['district' => 'Dhaka', 'area' => 'Mirpur 10'])
            ->assertOk()
            ->assertJsonPath('mosque.district', 'Dhaka')
            ->assertJsonPath('mosque.area', 'Mirpur 10');

        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('data.district', 'Dhaka')
            ->assertJsonPath('data.area', 'Mirpur 10');
    }

    public function test_mosque_admin_can_upload_serve_and_remove_a_photo(): void
    {
        Storage::fake('local');
        [, $mosque] = $this->actingAsMosqueAdmin();

        $url = $this->post("/api/admin/mosques/{$mosque->id}/photo", [
            'photo' => UploadedFile::fake()->image('front.jpg', 800, 500),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->json('mosque.photo_url');

        $path = $mosque->refresh()->photo_path;
        $this->assertNotNull($url);
        Storage::disk('local')->assertExists($path);
        $this->get("/api/mosques/{$mosque->id}/photo")->assertOk();
        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertJsonPath('data.mosque.photo_url', $url);

        $this->deleteJson("/api/admin/mosques/{$mosque->id}/photo")
            ->assertOk()
            ->assertJsonPath('mosque.photo_url', null);
        Storage::disk('local')->assertMissing($path);
        $this->get("/api/mosques/{$mosque->id}/photo")->assertNotFound();
    }

    public function test_mosque_photo_must_be_an_image_and_only_the_owner_can_upload(): void
    {
        Storage::fake('local');
        [, $mosque] = $this->actingAsMosqueAdmin();

        $this->post("/api/admin/mosques/{$mosque->id}/photo", [
            'photo' => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]));
        $this->post("/api/admin/mosques/{$mosque->id}/photo", [
            'photo' => UploadedFile::fake()->image('front.jpg'),
        ], ['Accept' => 'application/json'])->assertForbidden();
    }

    public function test_publishing_an_announcement_notifies_followers_once(): void
    {
        [, $mosque] = $this->actingAsMosqueAdmin();
        Follower::factory()->count(2)->create(['mosque_id' => $mosque->id]);

        $draft = $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Janazah notice',
            'body' => 'Janazah after Asr today.',
            'urgency' => 'high',
            'status' => 'draft',
        ])->assertCreated()->json('data.id');
        $this->assertSame(0, Notification::query()->count());

        $this->patchJson("/api/admin/mosques/{$mosque->id}/announcements/{$draft}/publish")->assertOk();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/announcements/{$draft}/unpublish")->assertOk();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/announcements/{$draft}/publish")->assertOk();

        $this->assertSame(2, Notification::query()
            ->where('reference_type', Notification::REFERENCE_ANNOUNCEMENT)
            ->where('reference_id', $draft)
            ->count());

        $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Jummah time change',
            'body' => 'Jummah moves to 1:30 PM.',
            'urgency' => 'medium',
            'status' => 'published',
        ])->assertCreated();

        $this->assertSame(4, Notification::query()->count());
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
            'latitude' => 23.7290000,
            'longitude' => 90.4138000,
        ]);
        Sanctum::actingAs($admin);

        return [$admin, $mosque];
    }

    private function publishAllPrayers(Mosque $mosque): void
    {
        foreach (['fajr' => '05:00', 'dhuhr' => '13:15', 'asr' => '16:30', 'maghrib' => '17:50', 'isha' => '19:30'] as $prayer => $jamaat) {
            PrayerTime::factory()->create([
                'mosque_id' => $mosque->id,
                'prayer' => $prayer,
                'adhan_time' => $jamaat,
                'jamaat_time' => $jamaat,
            ]);
        }
    }

    private function actingAsSuperAdmin(): User
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        Sanctum::actingAs($user);

        return $user;
    }
}