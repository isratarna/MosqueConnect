<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\User;
use App\Models\VolunteerOpportunity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VolunteerOpportunityManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_opportunities_appear_in_public_listing_and_inactive_are_hidden(): void
    {
        $mosque = Mosque::factory()->create();

        $active = VolunteerOpportunity::factory()->create([
            'mosque_id' => $mosque->id,
            'status' => VolunteerOpportunity::STATUS_ACTIVE,
            'title' => 'Community kitchen support',
            'opportunity_date' => '2026-09-10',
        ]);

        VolunteerOpportunity::factory()->create([
            'mosque_id' => $mosque->id,
            'status' => VolunteerOpportunity::STATUS_CLOSED,
            'opportunity_date' => '2026-09-12',
        ]);

        VolunteerOpportunity::factory()->create([
            'mosque_id' => $mosque->id,
            'status' => VolunteerOpportunity::STATUS_CANCELLED,
            'opportunity_date' => '2026-09-13',
        ]);

        $this->getJson('/api/volunteer-opportunities')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $active->id)
            ->assertJsonPath('data.0.title', 'Community kitchen support');
    }

    public function test_valid_opportunity_details_are_publicly_visible(): void
    {
        $opportunity = VolunteerOpportunity::factory()->active()->create([
            'title' => 'Quran class helper',
            'location' => 'Main hall',
            'volunteers_required' => 8,
        ]);

        $this->getJson("/api/volunteer-opportunities/{$opportunity->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $opportunity->id)
            ->assertJsonPath('data.title', 'Quran class helper')
            ->assertJsonPath('data.location', 'Main hall')
            ->assertJsonPath('data.volunteers_required', 8);
    }

    public function test_invalid_or_missing_opportunity_returns_404(): void
    {
        $this->getJson('/api/volunteer-opportunities/999999')->assertNotFound();

        $opportunity = VolunteerOpportunity::factory()->create(['status' => VolunteerOpportunity::STATUS_CLOSED]);
        $this->getJson("/api/volunteer-opportunities/{$opportunity->id}")->assertNotFound();
    }

    public function test_verified_mosque_admin_can_create_an_opportunity_for_their_mosque(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities", [
            'title' => 'Food drive setup',
            'description' => 'Help sort and pack food donations.',
            'opportunity_date' => '2026-09-15',
            'start_time' => '09:00',
            'end_time' => '12:00',
            'location' => 'Mosque hall',
            'volunteers_required' => 5,
            'requirements' => 'Bring gloves and a smile.',
            'status' => VolunteerOpportunity::STATUS_ACTIVE,
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Volunteer opportunity created successfully.')
            ->assertJsonPath('data.title', 'Food drive setup')
            ->assertJsonPath('data.mosque_id', $mosque->id);
    }

    public function test_mosque_admin_cannot_create_or_manage_another_mosques_opportunities(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $owner = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $owner->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $otherMosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities", [
            'title' => 'Test',
            'description' => 'Not allowed',
            'opportunity_date' => '2026-09-15',
            'start_time' => '09:00',
            'end_time' => '10:00',
            'location' => 'Here',
            'volunteers_required' => 1,
            'requirements' => 'Need help',
        ])->assertForbidden();

        $opportunity = VolunteerOpportunity::factory()->create(['mosque_id' => $mosque->id]);

        $this->getJson("/api/admin/mosques/{$otherMosque->id}/volunteer-opportunities/{$opportunity->id}")
            ->assertNotFound();

        $this->patchJson("/api/admin/mosques/{$otherMosque->id}/volunteer-opportunities/{$opportunity->id}", [
            'title' => 'Unauthorized edit',
        ])->assertNotFound();
    }

    public function test_verified_mosque_admin_can_update_and_close_their_own_opportunity(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $opportunity = VolunteerOpportunity::factory()->active()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Old title',
        ]);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}", [
            'title' => 'Updated title',
            'volunteers_required' => 7,
        ])->assertOk()->assertJsonPath('data.title', 'Updated title');

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}/status", [
            'status' => VolunteerOpportunity::STATUS_CLOSED,
        ])->assertOk()->assertJsonPath('data.status', VolunteerOpportunity::STATUS_CLOSED);

        $this->getJson('/api/volunteer-opportunities')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_mosque_admin_can_delete_their_own_opportunity(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id]);

        $this->deleteJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}")
            ->assertOk();

        $this->assertDatabaseMissing('volunteer_opportunities', ['id' => $opportunity->id]);
    }

    public function test_unauthorized_requests_and_invalid_payloads_are_rejected(): void
    {
        $mosque = Mosque::factory()->create();

        $this->postJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities", [])
            ->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_NORMAL_USER]));
        $this->getJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities")
            ->assertForbidden();

        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $ownedMosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$ownedMosque->id}/volunteer-opportunities", [
            'title' => '',
            'description' => 'desc',
            'opportunity_date' => 'not-a-date',
            'start_time' => '99:99',
            'end_time' => '10:00',
            'location' => 'Hall',
            'volunteers_required' => 0,
            'status' => 'unknown',
        ])->assertUnprocessable();

        $this->patchJson("/api/admin/mosques/{$ownedMosque->id}/volunteer-opportunities/999999", [
            'title' => 'Bad update',
        ])->assertNotFound();
    }

    public function test_request_body_cannot_change_mosque_id_or_bypass_route_ownership(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $otherMosque = Mosque::factory()->create();
        Sanctum::actingAs($admin);

        $opportunity = VolunteerOpportunity::factory()->active()->create(['mosque_id' => $mosque->id]);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/volunteer-opportunities/{$opportunity->id}", [
            'mosque_id' => $otherMosque->id,
            'title' => 'Attempted change',
        ])->assertUnprocessable();
    }
}
