<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\User;
use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VolunteerApplicationManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_apply_successfully_and_see_pending_status(): void
    {
        $user = User::factory()->create();
        $opportunity = VolunteerOpportunity::factory()->active()->create([
            'opportunity_date' => now()->addDays(3)->toDateString(),
            'volunteers_required' => 5,
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications")
            ->assertCreated()
            ->assertJsonPath('data.volunteer_opportunity_id', $opportunity->id)
            ->assertJsonPath('data.status', VolunteerApplication::STATUS_PENDING)
            ->assertJsonPath('message', 'Volunteer application submitted successfully.');

        $this->getJson('/api/me/volunteer-applications')
            ->assertOk()
            ->assertJsonPath('data.0.volunteer_opportunity_id', $opportunity->id)
            ->assertJsonPath('data.0.status', VolunteerApplication::STATUS_PENDING);
    }

    public function test_authenticated_active_user_only_and_duplicate_applications_are_rejected(): void
    {
        $user = User::factory()->create(['account_status' => User::STATUS_SUSPENDED]);
        $opportunity = VolunteerOpportunity::factory()->active()->create([
            'opportunity_date' => now()->addDays(5)->toDateString(),
        ]);

        Sanctum::actingAs($user);
        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications")
            ->assertForbidden();

        $activeUser = User::factory()->create();
        $sameOpportunity = VolunteerOpportunity::factory()->active()->create([
            'opportunity_date' => now()->addDays(6)->toDateString(),
        ]);

        Sanctum::actingAs($activeUser);
        $this->postJson("/api/volunteer-opportunities/{$sameOpportunity->id}/applications")->assertCreated();
        $this->postJson("/api/volunteer-opportunities/{$sameOpportunity->id}/applications")
            ->assertStatus(409)
            ->assertJsonPath('message', 'already applied');
    }

    public function test_reapply_after_cancel_works_but_reapply_after_reject_is_blocked(): void
    {
        $user = User::factory()->create();
        $opportunity = VolunteerOpportunity::factory()->active()->create([
            'opportunity_date' => now()->addDays(7)->toDateString(),
        ]);

        Sanctum::actingAs($user);

        $application = VolunteerApplication::factory()->create([
            'user_id' => $user->id,
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);

        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications")
            ->assertCreated()
            ->assertJsonPath('data.id', $application->id);

        $otherOpportunity = VolunteerOpportunity::factory()->active()->create([
            'opportunity_date' => now()->addDays(8)->toDateString(),
        ]);

        $rejected = VolunteerApplication::factory()->create([
            'user_id' => $user->id,
            'volunteer_opportunity_id' => $otherOpportunity->id,
            'status' => VolunteerApplication::STATUS_REJECTED,
        ]);

        $this->postJson("/api/volunteer-opportunities/{$otherOpportunity->id}/applications")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Your previous application for this opportunity was declined.');

        $this->assertDatabaseHas('volunteer_applications', ['id' => $rejected->id, 'status' => VolunteerApplication::STATUS_REJECTED]);
    }

    public function test_opportunity_eligibility_and_missing_routes_return_expected_errors(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/volunteer-opportunities/999999/applications')->assertNotFound();

        $closed = VolunteerOpportunity::factory()->create(['status' => VolunteerOpportunity::STATUS_CLOSED, 'opportunity_date' => now()->addDays(3)->toDateString()]);
        $this->postJson("/api/volunteer-opportunities/{$closed->id}/applications")->assertStatus(409);

        $cancelled = VolunteerOpportunity::factory()->create(['status' => VolunteerOpportunity::STATUS_CANCELLED, 'opportunity_date' => now()->addDays(2)->toDateString()]);
        $this->postJson("/api/volunteer-opportunities/{$cancelled->id}/applications")->assertStatus(409);

        $completed = VolunteerOpportunity::factory()->create(['status' => VolunteerOpportunity::STATUS_COMPLETED, 'opportunity_date' => now()->addDays(1)->toDateString()]);
        $this->postJson("/api/volunteer-opportunities/{$completed->id}/applications")->assertStatus(409);

        $past = VolunteerOpportunity::factory()->create(['status' => VolunteerOpportunity::STATUS_ACTIVE, 'opportunity_date' => now()->subDay()->toDateString()]);
        $this->postJson("/api/volunteer-opportunities/{$past->id}/applications")->assertStatus(409);

        $this->postJson('/api/volunteer-opportunities/not-a-number/applications')->assertNotFound();
    }

    public function test_capacity_rules_are_enforced_on_apply_and_accept(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $opportunity = VolunteerOpportunity::factory()->active()->create([
            'mosque_id' => $mosque->id,
            'volunteers_required' => 1,
            'opportunity_date' => now()->addDays(2)->toDateString(),
        ]);

        $firstUser = User::factory()->create();
        VolunteerApplication::factory()->create([
            'volunteer_opportunity_id' => $opportunity->id,
            'user_id' => $firstUser->id,
            'status' => VolunteerApplication::STATUS_ACCEPTED,
        ]);

        Sanctum::actingAs($user);
        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications")->assertStatus(409);

        Sanctum::actingAs($admin);
        $application = VolunteerApplication::factory()->create([
            'volunteer_opportunity_id' => $opportunity->id,
            'user_id' => $user->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/applications/{$application->id}/accept")
            ->assertStatus(409)
            ->assertJsonPath('message', 'This opportunity is full.');
    }

    public function test_user_can_list_only_their_own_applications_and_cancel_their_own_application(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $opportunity = VolunteerOpportunity::factory()->active()->create(['opportunity_date' => now()->addDays(4)->toDateString()]);
        $otherOpportunity = VolunteerOpportunity::factory()->active()->create(['opportunity_date' => now()->addDays(5)->toDateString()]);

        VolunteerApplication::factory()->create(['user_id' => $owner->id, 'volunteer_opportunity_id' => $opportunity->id, 'status' => VolunteerApplication::STATUS_PENDING]);
        VolunteerApplication::factory()->create(['user_id' => $other->id, 'volunteer_opportunity_id' => $otherOpportunity->id, 'status' => VolunteerApplication::STATUS_ACCEPTED]);

        Sanctum::actingAs($owner);
        $this->getJson('/api/me/volunteer-applications?status=pending')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonMissingPath('data.0.user.phone');

        $otherUserApplication = VolunteerApplication::query()->where('user_id', $other->id)->first();
        $this->getJson("/api/me/volunteer-applications/{$otherUserApplication->id}")
            ->assertNotFound();

        $ownApplication = VolunteerApplication::query()->where('user_id', $owner->id)->first();
        $this->patchJson("/api/me/volunteer-applications/{$ownApplication->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', VolunteerApplication::STATUS_CANCELLED);

        $this->patchJson("/api/me/volunteer-applications/{$otherUserApplication->id}/cancel")
            ->assertNotFound();
    }

    public function test_legacy_register_and_registration_endpoints_still_work(): void
    {
        $user = User::factory()->create();
        $opportunity = VolunteerOpportunity::factory()->active()->create([
            'opportunity_date' => now()->addDays(4)->toDateString(),
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/register")
            ->assertCreated()
            ->assertJsonPath('data.volunteer_opportunity_id', $opportunity->id)
            ->assertJsonPath('data.status', VolunteerApplication::STATUS_PENDING);

        $this->getJson('/api/me/volunteer-registrations')
            ->assertOk()
            ->assertJsonPath('data.0.volunteer_opportunity_id', $opportunity->id)
            ->assertJsonPath('data.0.status', VolunteerApplication::STATUS_PENDING);

        $this->deleteJson("/api/volunteer-opportunities/{$opportunity->id}/register")
            ->assertOk()
            ->assertJsonPath('data.status', VolunteerApplication::STATUS_CANCELLED);

        $this->assertDatabaseHas('volunteer_applications', [
            'volunteer_opportunity_id' => $opportunity->id,
            'user_id' => $user->id,
            'status' => VolunteerApplication::STATUS_CANCELLED,
        ]);
    }

    public function test_migration_backfills_legacy_rows_as_accepted_and_restores_old_table_on_down(): void
    {
        Schema::dropIfExists('volunteer_applications');
        Schema::dropIfExists('volunteer_registrations');

        Schema::create('volunteer_registrations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('volunteer_opportunity_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['volunteer_opportunity_id', 'user_id'], 'volunteer_registration_unique');
        });

        $mosque = Mosque::factory()->create();
        $volunteerOpportunity = VolunteerOpportunity::factory()->create(['mosque_id' => $mosque->id]);
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();

        DB::table('volunteer_registrations')->insert([
            ['id' => 1001, 'volunteer_opportunity_id' => $volunteerOpportunity->id, 'user_id' => $firstUser->id, 'created_at' => '2026-09-01 10:00:00', 'updated_at' => '2026-09-01 10:00:00'],
            ['id' => 1002, 'volunteer_opportunity_id' => $volunteerOpportunity->id, 'user_id' => $secondUser->id, 'created_at' => '2026-09-02 11:00:00', 'updated_at' => '2026-09-02 11:00:00'],
        ]);

        $migration = require base_path('database/migrations/2026_09_06_000001_rename_volunteer_registrations_to_applications.php');
        $migration->up();

        $this->assertDatabaseHas('volunteer_applications', [
            'id' => 1001,
            'volunteer_opportunity_id' => $volunteerOpportunity->id,
            'user_id' => $firstUser->id,
            'status' => VolunteerApplication::STATUS_ACCEPTED,
        ]);
        $this->assertDatabaseHas('volunteer_applications', [
            'id' => 1002,
            'volunteer_opportunity_id' => $volunteerOpportunity->id,
            'user_id' => $secondUser->id,
            'status' => VolunteerApplication::STATUS_ACCEPTED,
        ]);
        $this->assertFalse(Schema::hasTable('volunteer_registrations'));

        try {
            try {
                DB::table('volunteer_applications')->insert([
                    'volunteer_opportunity_id' => $volunteerOpportunity->id,
                    'user_id' => $firstUser->id,
                    'status' => VolunteerApplication::STATUS_PENDING,
                ]);
                $this->fail('Duplicate application rows should be rejected by the unique constraint.');
            } catch (\Throwable) {
                $this->assertTrue(true);
            }

            try {
                DB::table('volunteer_applications')->insert([
                    'volunteer_opportunity_id' => 999999,
                    'user_id' => $firstUser->id,
                    'status' => VolunteerApplication::STATUS_PENDING,
                ]);
                $this->fail('Invalid foreign key values should fail.');
            } catch (\Throwable) {
                $this->assertTrue(true);
            }

            $statusApplications = [];
            foreach ([VolunteerApplication::STATUS_PENDING, VolunteerApplication::STATUS_ACCEPTED, VolunteerApplication::STATUS_CANCELLED, VolunteerApplication::STATUS_REJECTED] as $status) {
                $statusApplications[$status] = VolunteerApplication::factory()->create([
                    'volunteer_opportunity_id' => $volunteerOpportunity->id,
                    'user_id' => User::factory()->create()->id,
                    'status' => $status,
                ]);
            }

            $migration->down();

            $this->assertTrue(Schema::hasTable('volunteer_registrations'));
            $this->assertDatabaseHas('volunteer_registrations', [
                'id' => 1001,
                'volunteer_opportunity_id' => $volunteerOpportunity->id,
                'user_id' => $firstUser->id,
            ]);
            foreach ([VolunteerApplication::STATUS_PENDING, VolunteerApplication::STATUS_ACCEPTED] as $status) {
                $application = $statusApplications[$status];
                $this->assertDatabaseHas('volunteer_registrations', [
                    'id' => $application->id,
                    'volunteer_opportunity_id' => $volunteerOpportunity->id,
                    'user_id' => $application->user_id,
                ]);
            }
            foreach ([VolunteerApplication::STATUS_CANCELLED, VolunteerApplication::STATUS_REJECTED] as $status) {
                $this->assertDatabaseMissing('volunteer_registrations', ['id' => $statusApplications[$status]->id]);
            }
            $this->assertFalse(Schema::hasTable('volunteer_applications'));
        } finally {
            $migration->up();
        }
    }

    public function test_admin_mosque_application_list_includes_pagination_metadata(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id]);
        VolunteerApplication::factory()->count(30)->create(['volunteer_opportunity_id' => $opportunity->id]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications")
            ->assertOk()
            ->assertJsonPath('meta.total', 30);

        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications?page=2")
            ->assertOk()
            ->assertJsonPath('meta.total', 30)
            ->assertJsonCount(5, 'data');
    }

    public function test_admin_application_lists_filter_by_status_and_include_applicant_details(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id]);
        $applicant = User::factory()->create(['name' => 'Applicant Name', 'phone' => '+8801700000000']);
        VolunteerApplication::factory()->create([
            'volunteer_opportunity_id' => $opportunity->id,
            'user_id' => $applicant->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);
        VolunteerApplication::factory()->create([
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_ACCEPTED,
        ]);
        VolunteerApplication::factory()->create([
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_REJECTED,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications?status=pending")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user.name', 'Applicant Name')
            ->assertJsonPath('data.0.user.phone', '+8801700000000');

        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/applications?status=accepted")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', VolunteerApplication::STATUS_ACCEPTED);
    }

    public function test_admin_application_list_uses_a_constant_number_of_queries(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id]);
        VolunteerApplication::factory()->count(10)->create(['volunteer_opportunity_id' => $opportunity->id]);
        Sanctum::actingAs($admin);

        DB::flushQueryLog();
        DB::enableQueryLog();
        try {
            $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications")
                ->assertOk()
                ->assertJsonCount(10, 'data');
            $queryCount = count(DB::getQueryLog());
        } finally {
            DB::disableQueryLog();
        }

        $this->assertLessThanOrEqual(12, $queryCount);
    }

    public function test_reaccepting_a_full_opportunity_returns_already_accepted(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id, 'volunteers_required' => 1]);
        $application = VolunteerApplication::factory()->create([
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_ACCEPTED,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now()->subDay(),
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/applications/{$application->id}/accept")
            ->assertStatus(422)
            ->assertJsonPath('message', 'This application has already been accepted.');
    }

    public function test_rerejecting_does_not_change_reviewed_at(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id]);
        $reviewedAt = now()->subDay()->startOfSecond();
        $application = VolunteerApplication::factory()->create([
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_REJECTED,
            'reviewed_by' => $admin->id,
            'reviewed_at' => $reviewedAt,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/applications/{$application->id}/reject")
            ->assertStatus(422)
            ->assertJsonPath('message', 'This application has already been rejected.');

        $this->assertDatabaseHas('volunteer_applications', [
            'id' => $application->id,
            'reviewed_at' => $reviewedAt->toDateTimeString(),
        ]);
    }

    public function test_accept_is_blocked_for_cancelled_or_completed_opportunities(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        Sanctum::actingAs($admin);

        foreach ([VolunteerOpportunity::STATUS_CANCELLED, VolunteerOpportunity::STATUS_COMPLETED] as $status) {
            $opportunity = VolunteerOpportunity::factory()->create(['mosque_id' => $mosque->id, 'status' => $status]);
            $application = VolunteerApplication::factory()->create([
                'volunteer_opportunity_id' => $opportunity->id,
                'status' => VolunteerApplication::STATUS_PENDING,
            ]);

            $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/applications/{$application->id}/accept")
                ->assertStatus(409);
        }
    }

    public function test_admin_binding_requires_matching_opportunity_and_mosque(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $otherMosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id, 'opportunity_date' => now()->addDays(3)->toDateString()]);
        $otherOpportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $otherMosque->id, 'opportunity_date' => now()->addDays(4)->toDateString()]);
        $application = VolunteerApplication::factory()->create(['volunteer_opportunity_id' => $opportunity->id, 'user_id' => User::factory()->create()->id, 'status' => VolunteerApplication::STATUS_PENDING]);
        $otherApplication = VolunteerApplication::factory()->create(['volunteer_opportunity_id' => $otherOpportunity->id, 'user_id' => User::factory()->create()->id, 'status' => VolunteerApplication::STATUS_PENDING]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/applications/{$otherApplication->id}/accept")
            ->assertNotFound();

        $this->patchJson("/api/admin/mosques/{$otherMosque->id}/volunteer-opportunities/{$opportunity->id}/applications/{$application->id}/accept")
            ->assertNotFound();
    }

    public function test_admin_routes_require_authorization_and_super_admin_is_allowed(): void
    {
        $regularUser = User::factory()->create();
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $unverifiedAdmin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $unverifiedMosque = Mosque::factory()->create(['owner_id' => $unverifiedAdmin->id, 'verification_status' => Mosque::VERIFICATION_PENDING]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id, 'opportunity_date' => now()->addDays(5)->toDateString()]);
        $application = VolunteerApplication::factory()->create(['volunteer_opportunity_id' => $opportunity->id, 'user_id' => User::factory()->create()->id, 'status' => VolunteerApplication::STATUS_PENDING]);

        Sanctum::actingAs($regularUser);
        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications")->assertForbidden();

        Sanctum::actingAs($unverifiedAdmin);
        $this->getJson("/api/admin/mosques/{$unverifiedMosque->id}/volunteer-applications")->assertForbidden();

        Sanctum::actingAs($admin);
        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications")->assertOk();

        Sanctum::actingAs($superAdmin);
        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications")->assertOk();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/applications/{$application->id}/accept")
            ->assertOk();
    }

    public function test_admin_can_revoke_acceptance_and_reject_invalid_transitions(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id, 'opportunity_date' => now()->addDays(6)->toDateString()]);
        $applicant = User::factory()->create();
        $application = VolunteerApplication::factory()->create([
            'volunteer_opportunity_id' => $opportunity->id,
            'user_id' => $applicant->id,
            'status' => VolunteerApplication::STATUS_ACCEPTED,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/applications/{$application->id}/reject")
            ->assertOk()
            ->assertJsonPath('data.status', VolunteerApplication::STATUS_REJECTED);

        $rejected = VolunteerApplication::factory()->create([
            'volunteer_opportunity_id' => $opportunity->id,
            'user_id' => User::factory()->create()->id,
            'status' => VolunteerApplication::STATUS_REJECTED,
        ]);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/applications/{$rejected->id}/accept")
            ->assertStatus(422);
    }

    public function test_admin_can_list_and_review_applications_for_own_mosque_only(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $otherAdmin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $otherMosque = Mosque::factory()->create(['owner_id' => $otherAdmin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id, 'opportunity_date' => now()->addDays(9)->toDateString()]);
        $applicant = User::factory()->create();
        $application = VolunteerApplication::factory()->create([
            'volunteer_opportunity_id' => $opportunity->id,
            'user_id' => $applicant->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);

        Sanctum::actingAs($admin);
        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications")
            ->assertOk()
            ->assertJsonPath('data.0.id', $application->id);

        $acceptResponse = $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/applications/{$application->id}/accept");
        $acceptResponse->assertOk()
            ->assertJsonPath('data.status', VolunteerApplication::STATUS_ACCEPTED);
        $this->assertNotNull($acceptResponse->json('data.reviewed_at'));

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/applications/{$application->id}/reject")
            ->assertOk();

        Sanctum::actingAs($otherAdmin);
        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications")
            ->assertForbidden();

        $this->getJson("/api/admin/mosques/{$otherMosque->id}/volunteer-opportunities/{$opportunity->id}/applications")
            ->assertNotFound();
    }
}
