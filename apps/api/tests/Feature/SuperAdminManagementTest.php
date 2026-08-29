<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\ContentReport;
use App\Models\Mosque;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuperAdminManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_overview_contains_every_required_summary_and_statistics(): void
    {
        $this->actingAsSuperAdmin();
        User::factory()->create();
        Mosque::factory()->create(['verification_status' => Mosque::VERIFICATION_VERIFIED]);

        $this->getJson('/api/super-admin/overview')
            ->assertOk()
            ->assertJsonStructure([
                'users_count',
                'mosques_count',
                'verified_mosques_count',
                'pending_claims_count',
                'active_reports_count',
                'pending_moderation_count',
                'users_by_role',
                'mosques_by_status',
                'recent_activity',
            ]);

        $this->getJson('/api/super-admin/statistics')
            ->assertOk()
            ->assertJsonStructure(['data' => ['monthly', 'content', 'moderation']]);
    }

    public function test_super_admin_can_approve_a_claim_and_assign_mosque_admin(): void
    {
        $superAdmin = $this->actingAsSuperAdmin();
        $applicant = User::factory()->create();
        $mosque = Mosque::factory()->create(['verification_status' => Mosque::VERIFICATION_PENDING]);
        $claim = $this->createClaim($applicant, $mosque);

        $this->patchJson("/api/super-admin/claims/{$claim->id}/approve", [
            'review_note' => 'Documents verified.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.mosque.verification_status', Mosque::VERIFICATION_VERIFIED)
            ->assertJsonPath('data.user.role', User::ROLE_MOSQUE_ADMIN);

        $this->assertDatabaseHas('mosques', ['id' => $mosque->id, 'owner_id' => $applicant->id]);
        $this->assertDatabaseHas('admin_audit_logs', ['actor_id' => $superAdmin->id, 'action' => 'claim.approved']);
    }

    public function test_claim_review_exposes_history_and_secure_document_download(): void
    {
        $this->actingAsSuperAdmin();
        Storage::fake('local');
        Storage::disk('local')->put('verification/test-proof.pdf', 'proof');
        $applicant = User::factory()->create();
        $firstMosque = Mosque::factory()->create();
        $secondMosque = Mosque::factory()->create();
        $firstClaim = $this->createClaim($applicant, $firstMosque);
        $secondClaim = $this->createClaim($applicant, $secondMosque);

        $this->getJson('/api/super-admin/claims')
            ->assertOk()
            ->assertJsonPath('data.0.applicant_claims_count', 2);

        $this->get("/api/super-admin/claims/{$firstClaim->id}/document")
            ->assertOk()
            ->assertHeader('content-disposition');

        $this->getJson("/api/super-admin/claims/{$secondClaim->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data.applicant_claims');
    }

    public function test_rejecting_claim_requires_reason_and_is_audited(): void
    {
        $superAdmin = $this->actingAsSuperAdmin();
        $claim = $this->createClaim(User::factory()->create(), Mosque::factory()->create());

        $this->patchJson("/api/super-admin/claims/{$claim->id}/reject", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('review_note');

        $this->patchJson("/api/super-admin/claims/{$claim->id}/reject", [
            'review_note' => 'Proof does not establish authority.',
        ])->assertOk()->assertJsonPath('data.status', 'rejected');

        $this->assertDatabaseHas('admin_audit_logs', ['actor_id' => $superAdmin->id, 'action' => 'claim.rejected']);
    }

    public function test_super_admin_can_manage_users_without_suspending_self(): void
    {
        $superAdmin = $this->actingAsSuperAdmin();
        $user = User::factory()->create();
        $user->createToken('test');

        $this->patchJson("/api/super-admin/users/{$user->id}", [
            'account_status' => User::STATUS_SUSPENDED,
            'suspension_reason' => 'Repeated abuse.',
        ])->assertOk()->assertJsonPath('data.account_status', User::STATUS_SUSPENDED);

        $this->assertCount(0, $user->tokens()->get());
        $this->patchJson("/api/super-admin/users/{$superAdmin->id}", [
            'account_status' => User::STATUS_SUSPENDED,
            'suspension_reason' => 'Invalid self action.',
        ])->assertUnprocessable();
    }

    public function test_super_admin_can_verify_mosques_and_moderate_content(): void
    {
        $this->actingAsSuperAdmin();
        $owner = User::factory()->create();
        $mosque = Mosque::factory()->create(['owner_id' => $owner->id]);
        $announcement = Announcement::factory()->create([
            'mosque_id' => $mosque->id,
            'moderation_status' => Announcement::MODERATION_PENDING,
        ]);

        $this->patchJson("/api/super-admin/mosques/{$mosque->id}/verification", [
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ])->assertOk()->assertJsonPath('data.verification_status', Mosque::VERIFICATION_VERIFIED);

        $this->patchJson("/api/super-admin/moderation/announcement/{$announcement->id}", [
            'moderation_status' => Announcement::MODERATION_REJECTED,
            'moderation_note' => 'Contains unsafe misinformation.',
        ])->assertOk()->assertJsonPath('data.moderation_status', Announcement::MODERATION_REJECTED);

        $this->assertSame(User::ROLE_MOSQUE_ADMIN, $owner->refresh()->role);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'content.moderated']);
    }

    public function test_mosque_admin_management_changes_are_visible_in_audit_log(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'name' => 'Updated by Mosque Admin',
        ])->assertOk();

        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'mosque_admin.mosque.updated',
            'target_id' => $mosque->id,
        ]);
    }

    public function test_users_can_report_content_and_super_admin_can_resolve_it(): void
    {
        $reporter = User::factory()->create();
        $mosque = Mosque::factory()->create();
        $announcement = Announcement::factory()->create(['mosque_id' => $mosque->id]);
        Sanctum::actingAs($reporter);

        $reportId = $this->postJson('/api/reports', [
            'reportable_type' => 'announcement',
            'reportable_id' => $announcement->id,
            'category' => 'inaccurate',
            'reason' => 'The announced time is incorrect.',
        ])->assertCreated()->json('data.id');

        $this->actingAsSuperAdmin();
        $this->patchJson("/api/super-admin/reports/{$reportId}", [
            'status' => ContentReport::STATUS_RESOLVED,
            'resolution_note' => 'Mosque administrator corrected the time.',
        ])->assertOk()->assertJsonPath('data.status', ContentReport::STATUS_RESOLVED);
    }

    public function test_super_admin_can_manage_settings_and_read_audit_log(): void
    {
        $this->actingAsSuperAdmin();

        $this->patchJson('/api/super-admin/settings', [
            'maintenance_notice' => 'Scheduled maintenance tonight.',
            'claims_enabled' => false,
        ])->assertOk()
            ->assertJsonPath('data.maintenance_notice', 'Scheduled maintenance tonight.')
            ->assertJsonPath('data.claims_enabled', false);

        $this->assertDatabaseHas('system_settings', ['key' => 'claims_enabled']);
        $this->getJson('/api/super-admin/audit-logs')
            ->assertOk()
            ->assertJsonPath('data.0.action', 'settings.updated');
    }

    public function test_non_super_admin_cannot_access_management_routes(): void
    {
        Sanctum::actingAs(User::factory()->create());

        foreach (['overview', 'users', 'mosques', 'claims', 'reports', 'audit-logs', 'settings'] as $path) {
            $this->getJson("/api/super-admin/{$path}")->assertForbidden();
        }
    }

    private function actingAsSuperAdmin(): User
    {
        $user = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function createClaim(User $user, Mosque $mosque): VerificationRequest
    {
        return VerificationRequest::query()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'document_path' => 'verification/test-proof.pdf',
            'status' => 'pending',
            'submitted_at' => now(),
        ]);
    }
}
