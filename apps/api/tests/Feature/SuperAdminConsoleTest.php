<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Announcement;
use App\Models\Broadcast;
use App\Models\Campaign;
use App\Models\ContentReport;
use App\Models\Event;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuperAdminConsoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_settings_need_no_login_and_refresh_when_saved(): void
    {
        $this->getJson('/api/settings/public')
            ->assertOk()
            ->assertExactJson(['data' => [
                'maintenance_notice' => '',
                'claims_enabled' => true,
                'reports_enabled' => true,
                'eid_season' => null,
            ]]);

        $this->actingAsSuperAdmin();
        $this->patchJson('/api/super-admin/settings', [
            'maintenance_notice' => 'Maintenance tonight 11 PM to midnight.',
            'claims_enabled' => false,
        ])->assertOk();

        $this->app['auth']->forgetGuards();

        $this->getJson('/api/settings/public')
            ->assertOk()
            ->assertJsonPath('data.maintenance_notice', 'Maintenance tonight 11 PM to midnight.')
            ->assertJsonPath('data.claims_enabled', false)
            ->assertJsonMissingPath('data.auto_publish_verified_mosques');
    }

    public function test_auto_publish_setting_has_been_removed(): void
    {
        $this->actingAsSuperAdmin();

        $this->getJson('/api/super-admin/settings')->assertOk()->assertJsonMissingPath('data.auto_publish_verified_mosques');
        $this->patchJson('/api/super-admin/settings', ['auto_publish_verified_mosques' => false])->assertOk();
        $this->assertDatabaseMissing('system_settings', ['key' => 'auto_publish_verified_mosques']);
        $this->assertArrayNotHasKey('auto_publish_verified_mosques', SystemSetting::DEFAULTS);
    }

    public function test_broadcast_reaches_its_audience_and_is_audited(): void
    {
        $admin = $this->actingAsSuperAdmin();
        $normal = User::factory()->create();
        $mosqueAdmin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        User::factory()->create(['account_status' => User::STATUS_SUSPENDED]);

        $this->postJson('/api/super-admin/broadcasts', [
            'title' => 'Eid moon sighted',
            'message' => "Check your mosque's Eid times.",
            'audience' => 'all',
            'link' => '/eid',
        ])->assertCreated()->assertJsonPath('data.recipients_count', 3);

        $this->assertDatabaseHas('notifications', ['user_id' => $normal->id, 'mosque_id' => null, 'type' => 'system', 'title' => 'Eid moon sighted', 'link' => '/eid']);
        $this->assertSame(3, Notification::query()->where('reference_type', 'broadcast')->count());
        $this->assertDatabaseHas('admin_audit_logs', ['actor_id' => $admin->id, 'action' => 'broadcast.sent']);

        $this->postJson('/api/super-admin/broadcasts', [
            'title' => 'For mosque admins',
            'message' => 'Please update your Eid jamaats.',
            'audience' => 'role',
            'audience_value' => 'mosque_admin',
        ])->assertCreated()->assertJsonPath('data.recipients_count', 1);
        $this->assertDatabaseHas('notifications', ['user_id' => $mosqueAdmin->id, 'title' => 'For mosque admins']);
        $this->assertDatabaseMissing('notifications', ['user_id' => $normal->id, 'title' => 'For mosque admins']);

        $this->getJson('/api/super-admin/broadcasts')->assertOk()->assertJsonCount(2, 'data');

        // The recipient sees it like any other notification.
        Sanctum::actingAs($normal);
        $this->getJson('/api/notifications')->assertOk()
            ->assertJsonPath('data.0.title', 'Eid moon sighted')
            ->assertJsonPath('data.0.link', '/eid')
            ->assertJsonPath('data.0.mosque', null);
    }

    public function test_district_broadcast_targets_followers_of_mosques_there(): void
    {
        $this->actingAsSuperAdmin();
        $dhakaFollower = User::factory()->create();
        $sylhetFollower = User::factory()->create();
        Follower::factory()->create(['user_id' => $dhakaFollower->id, 'mosque_id' => Mosque::factory()->create(['district' => 'Dhaka'])->id]);
        Follower::factory()->create(['user_id' => $sylhetFollower->id, 'mosque_id' => Mosque::factory()->create(['district' => 'Sylhet'])->id]);

        $this->postJson('/api/super-admin/broadcasts', [
            'title' => 'Flood warning',
            'message' => 'Some mosques in Dhaka are closed today.',
            'audience' => 'district',
            'audience_value' => 'dhaka',
        ])->assertCreated()->assertJsonPath('data.recipients_count', 1);

        $this->assertDatabaseHas('notifications', ['user_id' => $dhakaFollower->id, 'title' => 'Flood warning']);
        $this->assertDatabaseMissing('notifications', ['user_id' => $sylhetFollower->id, 'title' => 'Flood warning']);
    }

    public function test_broadcast_validation_rejects_bad_input(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/super-admin/broadcasts', ['title' => 'x', 'message' => 'y', 'audience' => 'role'])
            ->assertUnprocessable()->assertJsonValidationErrors('audience_value');
        $this->postJson('/api/super-admin/broadcasts', ['title' => 'x', 'message' => 'y', 'audience' => 'role', 'audience_value' => 'king'])
            ->assertUnprocessable()->assertJsonValidationErrors('audience_value');
        $this->postJson('/api/super-admin/broadcasts', ['title' => 'x', 'message' => 'y', 'audience' => 'all', 'link' => 'javascript:alert(1)'])
            ->assertUnprocessable()->assertJsonValidationErrors('link');
        $this->postJson('/api/super-admin/broadcasts', ['title' => 'x', 'message' => 'y', 'audience' => 'all', 'link' => '//evil.example'])
            ->assertUnprocessable()->assertJsonValidationErrors('link');

        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]));
        $this->postJson('/api/super-admin/broadcasts', ['title' => 'x', 'message' => 'y', 'audience' => 'all'])->assertForbidden();
    }

    public function test_super_admin_can_edit_a_mosque(): void
    {
        $admin = $this->actingAsSuperAdmin();
        $mosque = Mosque::factory()->create(['name' => 'Old Name']);

        $this->patchJson("/api/super-admin/mosques/{$mosque->id}", ['name' => 'Baitul Aman Jame Masjid', 'district' => 'Dhaka'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Baitul Aman Jame Masjid');

        $this->assertDatabaseHas('mosques', ['id' => $mosque->id, 'name' => 'Baitul Aman Jame Masjid', 'district' => 'Dhaka']);
        $log = AdminAuditLog::query()->where('action', 'mosque.updated')->sole();
        $this->assertSame($admin->id, $log->actor_id);
        $this->assertSame('Old Name', $log->metadata['before']['name']);
    }

    public function test_merge_moves_everything_onto_the_target_and_deletes_the_duplicate(): void
    {
        $admin = $this->actingAsSuperAdmin();
        $target = Mosque::factory()->create(['name' => 'Baitul Aman']);
        $duplicate = Mosque::factory()->create(['name' => 'Baitul Aman (duplicate)']);
        $both = User::factory()->create();
        $onlyDuplicate = User::factory()->create();
        Follower::factory()->create(['user_id' => $both->id, 'mosque_id' => $target->id]);
        Follower::factory()->create(['user_id' => $both->id, 'mosque_id' => $duplicate->id]);
        Follower::factory()->create(['user_id' => $onlyDuplicate->id, 'mosque_id' => $duplicate->id]);
        $event = Event::factory()->create(['mosque_id' => $duplicate->id]);
        $announcement = Announcement::factory()->create(['mosque_id' => $duplicate->id]);
        $campaign = Campaign::factory()->create(['mosque_id' => $duplicate->id]);
        $claimant = User::factory()->create();
        $claim = $this->claim($claimant, $duplicate);
        $report = ContentReport::query()->create([
            'reporter_id' => $both->id, 'reportable_type' => 'mosque', 'reportable_id' => $duplicate->id,
            'category' => 'inaccurate', 'reason' => 'Duplicate listing', 'status' => 'pending',
        ]);

        $this->postJson("/api/super-admin/mosques/{$duplicate->id}/merge", ['into_mosque_id' => $target->id])
            ->assertOk()
            ->assertJsonPath('data.moved.followers', 1)
            ->assertJsonPath('data.moved.events', 1)
            ->assertJsonPath('data.moved.claims', 1);

        $this->assertDatabaseMissing('mosques', ['id' => $duplicate->id]);
        $this->assertSame(2, $target->followers()->count());
        $this->assertSame($target->id, $event->fresh()->mosque_id);
        $this->assertSame($target->id, $announcement->fresh()->mosque_id);
        $this->assertSame($target->id, $campaign->fresh()->mosque_id);
        $this->assertSame($target->id, $claim->fresh()->mosque_id);
        $this->assertSame("{$claimant->id}:{$target->id}", $claim->fresh()->active_claim_key);
        $this->assertSame($target->id, $report->fresh()->reportable_id);

        $log = AdminAuditLog::query()->where('action', 'mosque.merged')->sole();
        $this->assertSame($admin->id, $log->actor_id);
        $this->assertSame($target->id, $log->target_id);
        $this->assertSame($duplicate->id, $log->metadata['merged_mosque']['id']);
    }

    public function test_merge_closes_a_claim_that_would_duplicate_one_on_the_target(): void
    {
        $this->actingAsSuperAdmin();
        $target = Mosque::factory()->create();
        $duplicate = Mosque::factory()->create();
        $applicant = User::factory()->create();
        $onTarget = $this->claim($applicant, $target);
        $onDuplicate = $this->claim($applicant, $duplicate);

        $this->postJson("/api/super-admin/mosques/{$duplicate->id}/merge", ['into_mosque_id' => $target->id])->assertOk();

        $this->assertSame(VerificationRequest::STATUS_PENDING, $onTarget->fresh()->status);
        $this->assertSame(VerificationRequest::STATUS_REJECTED, $onDuplicate->fresh()->status);
        $this->assertNull($onDuplicate->fresh()->active_claim_key);
    }

    public function test_merge_is_refused_for_bad_targets_and_managed_mosques(): void
    {
        $this->actingAsSuperAdmin();
        $mosque = Mosque::factory()->create();
        $managed = Mosque::factory()->create(['owner_id' => User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN])->id]);

        $this->postJson("/api/super-admin/mosques/{$mosque->id}/merge", ['into_mosque_id' => $mosque->id])
            ->assertUnprocessable()->assertJsonValidationErrors('into_mosque_id');
        $this->postJson("/api/super-admin/mosques/{$mosque->id}/merge", ['into_mosque_id' => 99999])
            ->assertUnprocessable()->assertJsonValidationErrors('into_mosque_id');
        $this->postJson("/api/super-admin/mosques/{$managed->id}/merge", ['into_mosque_id' => $mosque->id])
            ->assertUnprocessable();

        $this->assertDatabaseHas('mosques', ['id' => $managed->id]);
    }

    public function test_delete_needs_force_when_the_mosque_has_content(): void
    {
        $this->actingAsSuperAdmin();
        $empty = Mosque::factory()->create();
        $busy = Mosque::factory()->create();
        Event::factory()->create(['mosque_id' => $busy->id]);

        $this->deleteJson("/api/super-admin/mosques/{$empty->id}")->assertOk();
        $this->assertDatabaseMissing('mosques', ['id' => $empty->id]);

        $this->deleteJson("/api/super-admin/mosques/{$busy->id}")
            ->assertStatus(409)
            ->assertJsonPath('content.events', 1);
        $this->assertDatabaseHas('mosques', ['id' => $busy->id]);

        $this->deleteJson("/api/super-admin/mosques/{$busy->id}?force=1")->assertOk();
        $this->assertDatabaseMissing('mosques', ['id' => $busy->id]);
        $this->assertSame(2, AdminAuditLog::query()->where('action', 'mosque.deleted')->count());
    }

    public function test_force_deleting_a_managed_mosque_demotes_its_admin(): void
    {
        $this->actingAsSuperAdmin();
        $owner = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $owner->id]);

        $this->deleteJson("/api/super-admin/mosques/{$mosque->id}?force=1")->assertOk();

        $this->assertSame(User::ROLE_NORMAL_USER, $owner->fresh()->role);
    }

    public function test_claim_document_can_be_previewed_inline_with_the_right_type(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('verification/proof.pdf', '%PDF-1.4 proof');
        $claim = $this->claim(User::factory()->create(), Mosque::factory()->create());

        $this->withHeader('Accept', 'application/json')->get("/api/super-admin/claims/{$claim->id}/document?inline=1")->assertUnauthorized();

        $this->actingAsSuperAdmin();
        $response = $this->get("/api/super-admin/claims/{$claim->id}/document?inline=1")->assertOk();
        $this->assertStringStartsWith('inline', $response->headers->get('content-disposition'));
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
        $this->assertSame('nosniff', $response->headers->get('x-content-type-options'));

        $download = $this->get("/api/super-admin/claims/{$claim->id}/document")->assertOk();
        $this->assertStringStartsWith('attachment', $download->headers->get('content-disposition'));

        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]));
        $this->get("/api/super-admin/claims/{$claim->id}/document?inline=1")->assertForbidden();
    }

    public function test_claims_show_competing_claims_for_the_same_mosque(): void
    {
        $this->actingAsSuperAdmin();
        $mosque = Mosque::factory()->create();
        $first = $this->claim(User::factory()->create(), $mosque);
        $second = $this->claim(User::factory()->create(), $mosque);
        $this->claim(User::factory()->create(), Mosque::factory()->create());

        $this->getJson("/api/super-admin/claims/{$first->id}")
            ->assertOk()
            ->assertJsonCount(1, 'competing_claims')
            ->assertJsonPath('competing_claims.0.id', $second->id);

        $claims = collect($this->getJson('/api/super-admin/claims')->assertOk()->json('data'))->keyBy('id');
        $this->assertEquals(1, $claims[$first->id]['competing_claims_count']);
        $this->assertEquals(0, $claims->firstWhere('mosque_id', '!=', $mosque->id)['competing_claims_count']);
    }

    public function test_user_detail_includes_claims_reports_and_suspension_history(): void
    {
        $this->actingAsSuperAdmin();
        $user = User::factory()->create();
        $this->claim($user, Mosque::factory()->create());
        ContentReport::query()->create([
            'reporter_id' => $user->id, 'reportable_type' => 'mosque', 'reportable_id' => 1,
            'category' => 'spam', 'reason' => 'Spam', 'status' => 'pending',
        ]);

        $this->patchJson("/api/super-admin/users/{$user->id}", ['account_status' => 'suspended', 'suspension_reason' => 'Fake claims'])->assertOk();
        $this->patchJson("/api/super-admin/users/{$user->id}", ['account_status' => 'active'])->assertOk();
        $this->patchJson("/api/super-admin/users/{$user->id}", ['name' => 'Renamed'])->assertOk();

        $this->getJson("/api/super-admin/users/{$user->id}")
            ->assertOk()
            ->assertJsonPath('data.user.name', 'Renamed')
            ->assertJsonCount(1, 'data.claims')
            ->assertJsonCount(1, 'data.reports')
            ->assertJsonCount(0, 'data.donations')
            ->assertJsonCount(2, 'data.suspension_history')
            ->assertJsonPath('data.suspension_history.0.status', 'active')
            ->assertJsonPath('data.suspension_history.1.status', 'suspended')
            ->assertJsonPath('data.suspension_history.1.reason', 'Fake claims');
    }

    public function test_audit_log_filters_and_csv_export(): void
    {
        $admin = $this->actingAsSuperAdmin();
        $other = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        AdminAuditLog::query()->create(['actor_id' => $admin->id, 'action' => 'claim.approved', 'created_at' => '2026-09-01 10:00:00']);
        AdminAuditLog::query()->create(['actor_id' => $other->id, 'action' => 'claim.approved', 'created_at' => '2026-09-15 10:00:00']);
        AdminAuditLog::query()->create(['actor_id' => $admin->id, 'action' => 'user.updated', 'created_at' => '2026-09-20 10:00:00', 'metadata' => ['note' => '=HYPERLINK("x")']]);

        $this->getJson('/api/super-admin/audit-logs?action=claim.approved')->assertOk()->assertJsonPath('total', 2);
        $this->getJson("/api/super-admin/audit-logs?actor_id={$other->id}")->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/super-admin/audit-logs?from=2026-09-10&to=2026-09-15')->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/super-admin/audit-logs?from=2026-09-20&to=2026-09-10')->assertUnprocessable();
        $this->getJson('/api/super-admin/audit-logs/actions')->assertOk()->assertJsonPath('data', ['claim.approved', 'user.updated']);

        $response = $this->get('/api/super-admin/audit-logs/export?action=claim.approved')->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('content-type'));
        $csv = $response->streamedContent();
        $lines = array_values(array_filter(explode("\n", trim($csv))));
        $this->assertCount(3, $lines);
        $this->assertStringStartsWith('id,time,actor_id,actor,action', $lines[0]);

        $all = $this->get('/api/super-admin/audit-logs/export?action=user.updated')->streamedContent();
        $this->assertStringContainsString('HYPERLINK', $all);
        $this->assertStringNotContainsString(',"=HYPERLINK', $all);
    }

    private function actingAsSuperAdmin(): User
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function claim(User $user, Mosque $mosque): VerificationRequest
    {
        return VerificationRequest::query()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'document_path' => 'verification/proof.pdf',
            'status' => VerificationRequest::STATUS_PENDING,
            'submitted_at' => now(),
        ]);
    }
}
