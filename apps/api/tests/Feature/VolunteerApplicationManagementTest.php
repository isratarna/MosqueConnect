<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\User;
use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VolunteerApplicationManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_apply_to_active_opportunity(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id]);

        $user = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications", [
            'message' => 'I can help with setup on Saturday.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Volunteer application submitted successfully.')
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.status', VolunteerApplication::STATUS_PENDING);

        $this->assertDatabaseHas('volunteer_applications', [
            'volunteer_opportunity_id' => $opportunity->id,
            'user_id' => $user->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);
    }

    public function test_user_cannot_submit_duplicate_application_for_same_opportunity(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id]);

        $user = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);
        Sanctum::actingAs($user);

        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications", [
            'message' => 'First application',
        ])->assertCreated();

        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications", [
            'message' => 'Second application',
        ])->assertStatus(422);
    }

    public function test_user_can_list_and_view_their_own_applications(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id]);

        $user = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);
        $otherUser = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);

        $myApplication = VolunteerApplication::factory()->create([
            'user_id' => $user->id,
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);

        VolunteerApplication::factory()->create([
            'user_id' => $otherUser->id,
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/volunteer-applications')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson("/api/volunteer-applications/{$myApplication->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $myApplication->id);

        $this->getJson('/api/volunteer-applications/999999')
            ->assertNotFound();
    }

    public function test_mosque_admin_can_review_applications_for_their_mosque(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id]);
        $user = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);
        $application = VolunteerApplication::factory()->create([
            'user_id' => $user->id,
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-applications/{$application->id}/accept")
            ->assertOk()
            ->assertJsonPath('data.status', VolunteerApplication::STATUS_ACCEPTED);

        $this->assertDatabaseHas('volunteer_applications', [
            'id' => $application->id,
            'status' => VolunteerApplication::STATUS_ACCEPTED,
        ]);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-applications/{$application->id}/reject")
            ->assertStatus(422);
    }

    public function test_unauthenticated_user_cannot_apply(): void
    {
        [$admin, $mosque, $opportunity] = $this->setupAdminOpportunity();

        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications", [
            'message' => 'I want to volunteer.',
        ])->assertUnauthorized();
    }

    public function test_application_to_nonexistent_opportunity_returns_404(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_NORMAL_USER]));

        $this->postJson('/api/volunteer-opportunities/999999/applications', [
            'message' => 'I want to volunteer.',
        ])->assertNotFound();
    }

    public function test_closed_opportunity_cannot_receive_applications(): void
    {
        [$admin, $mosque] = $this->setupAdminOpportunity();
        $opportunity = VolunteerOpportunity::factory()->create([
            'mosque_id' => $mosque->id,
            'status' => VolunteerOpportunity::STATUS_CLOSED,
        ]);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_NORMAL_USER]));

        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications", [
            'message' => 'I want to volunteer.',
        ])->assertNotFound();
    }

    public function test_cancelled_opportunity_cannot_receive_applications(): void
    {
        [$admin, $mosque] = $this->setupAdminOpportunity();
        $opportunity = VolunteerOpportunity::factory()->create([
            'mosque_id' => $mosque->id,
            'status' => VolunteerOpportunity::STATUS_CANCELLED,
        ]);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_NORMAL_USER]));

        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications", [
            'message' => 'I want to volunteer.',
        ])->assertNotFound();
    }

    public function test_completed_opportunity_cannot_receive_applications(): void
    {
        [$admin, $mosque] = $this->setupAdminOpportunity();
        $opportunity = VolunteerOpportunity::factory()->create([
            'mosque_id' => $mosque->id,
            'status' => VolunteerOpportunity::STATUS_COMPLETED,
        ]);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_NORMAL_USER]));

        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications", [
            'message' => 'I want to volunteer.',
        ])->assertNotFound();
    }

    public function test_application_always_uses_authenticated_user_even_if_user_id_is_forged(): void
    {
        [$admin, $mosque, $opportunity] = $this->setupAdminOpportunity();
        $user = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);
        $otherUser = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);
        Sanctum::actingAs($user);

        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications", [
            'user_id' => $otherUser->id,
            'message' => 'I am definitely myself.',
        ])->assertCreated()
            ->assertJsonPath('data.user_id', $user->id);

        $this->assertDatabaseHas('volunteer_applications', [
            'volunteer_opportunity_id' => $opportunity->id,
            'user_id' => $user->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);

        $this->assertDatabaseMissing('volunteer_applications', [
            'volunteer_opportunity_id' => $opportunity->id,
            'user_id' => $otherUser->id,
        ]);
    }

    public function test_user_cannot_view_another_users_application(): void
    {
        [$admin, $mosque, $opportunity] = $this->setupAdminOpportunity();
        $user = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);
        $otherUser = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);
        $otherApplication = VolunteerApplication::factory()->create([
            'user_id' => $otherUser->id,
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);
        Sanctum::actingAs($user);

        $this->getJson("/api/volunteer-applications/{$otherApplication->id}")
            ->assertForbidden();
    }

    public function test_mosque_admin_cannot_access_another_mosques_applications(): void
    {
        [$admin, $mosque] = $this->setupAdminOpportunity();
        $otherOwner = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $otherMosque = Mosque::factory()->create([
            'owner_id' => $otherOwner->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $otherOpportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $otherMosque->id]);
        $otherApplication = VolunteerApplication::factory()->create([
            'user_id' => User::factory()->create(['role' => User::ROLE_NORMAL_USER])->id,
            'volunteer_opportunity_id' => $otherOpportunity->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$otherMosque->id}/volunteer-applications")
            ->assertForbidden();

        $this->getJson("/api/admin/mosques/{$otherMosque->id}/volunteer-applications/{$otherApplication->id}")
            ->assertForbidden();

        $this->patchJson("/api/admin/mosques/{$otherMosque->id}/volunteer-applications/{$otherApplication->id}/accept")
            ->assertForbidden();
    }

    public function test_nested_mosque_application_route_mismatch_cannot_bypass_ownership(): void
    {
        [$admin, $mosque] = $this->setupAdminOpportunity();
        $otherOwner = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $otherMosque = Mosque::factory()->create([
            'owner_id' => $otherOwner->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $otherOpportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $otherMosque->id]);
        $otherApplication = VolunteerApplication::factory()->create([
            'user_id' => User::factory()->create(['role' => User::ROLE_NORMAL_USER])->id,
            'volunteer_opportunity_id' => $otherOpportunity->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications/{$otherApplication->id}")
            ->assertNotFound();

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-applications/{$otherApplication->id}/accept")
            ->assertNotFound();

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-applications/{$otherApplication->id}/reject")
            ->assertNotFound();
    }

    public function test_normal_user_cannot_access_mosque_admin_review_endpoints(): void
    {
        [$admin, $mosque] = $this->setupAdminOpportunity();
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_NORMAL_USER]));

        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications")
            ->assertForbidden();
    }

    public function test_unauthenticated_admin_requests_are_rejected(): void
    {
        [$admin, $mosque] = $this->setupAdminOpportunity();

        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-applications")
            ->assertUnauthorized();
    }

    public function test_authorized_mosque_admin_can_reject_a_pending_application(): void
    {
        [$admin, $mosque, $opportunity] = $this->setupAdminOpportunity();
        $user = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);
        $application = VolunteerApplication::factory()->create([
            'user_id' => $user->id,
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-applications/{$application->id}/reject", [
            'review_note' => 'We already have enough volunteers.',
        ])->assertOk()
            ->assertJsonPath('data.status', VolunteerApplication::STATUS_REJECTED);

        $this->assertDatabaseHas('volunteer_applications', [
            'id' => $application->id,
            'status' => VolunteerApplication::STATUS_REJECTED,
            'reviewed_by' => $admin->id,
            'review_note' => 'We already have enough volunteers.',
        ]);
    }

    public function test_invalid_status_transitions_are_rejected(): void
    {
        [$admin, $mosque, $opportunity] = $this->setupAdminOpportunity();
        $user = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);
        $application = VolunteerApplication::factory()->create([
            'user_id' => $user->id,
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);
        $rejectedApplication = VolunteerApplication::factory()->create([
            'user_id' => $user->id,
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_REJECTED,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-applications/{$application->id}/accept")
            ->assertOk();

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-applications/{$application->id}/accept")
            ->assertStatus(422);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-applications/{$application->id}/reject")
            ->assertStatus(422);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-applications/{$rejectedApplication->id}/accept")
            ->assertStatus(422);
    }

    public function test_user_can_reapply_after_application_rejection(): void
    {
        [$admin, $mosque, $opportunity] = $this->setupAdminOpportunity();
        $user = User::factory()->create(['role' => User::ROLE_NORMAL_USER]);
        VolunteerApplication::factory()->create([
            'user_id' => $user->id,
            'volunteer_opportunity_id' => $opportunity->id,
            'status' => VolunteerApplication::STATUS_REJECTED,
        ]);
        Sanctum::actingAs($user);

        $this->postJson("/api/volunteer-opportunities/{$opportunity->id}/applications", [
            'message' => 'Please reconsider my application.',
        ])->assertCreated();

        $this->assertDatabaseHas('volunteer_applications', [
            'volunteer_opportunity_id' => $opportunity->id,
            'user_id' => $user->id,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);

        $this->assertDatabaseCount('volunteer_applications', 2);
    }

    /**
     * @return array{User, Mosque, VolunteerOpportunity}
     */
    private function setupAdminOpportunity(): array
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id]);

        return [$admin, $mosque, $opportunity];
    }
}
