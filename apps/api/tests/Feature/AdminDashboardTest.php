<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
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

    private function actingAsSuperAdmin(): User
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        Sanctum::actingAs($user);

        return $user;
    }
}