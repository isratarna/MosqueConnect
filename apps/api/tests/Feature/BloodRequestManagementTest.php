<?php

namespace Tests\Feature;

use App\Models\BloodRequest;
use App\Models\BloodRequestResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BloodRequestManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_blood_requests_are_listed_publicly_and_inactive_are_hidden(): void
    {
        $active = BloodRequest::factory()->active()->create([
            'blood_group' => 'O-',
            'hospital_or_location' => 'Central Hospital',
        ]);

        BloodRequest::factory()->cancelled()->create();
        BloodRequest::factory()->completed()->create();
        BloodRequest::factory()->closed()->create();
        BloodRequest::factory()->expired()->create();

        $this->getJson('/api/blood-requests')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $active->id)
            ->assertJsonPath('data.0.blood_group', 'O-')
            ->assertJsonPath('data.0.hospital_or_location', 'Central Hospital')
            ->assertJsonPath('data.0.open', true);
    }

    public function test_public_can_view_details_of_an_active_blood_request(): void
    {
        $bloodRequest = BloodRequest::factory()->active()->create();

        $this->getJson("/api/blood-requests/{$bloodRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $bloodRequest->id);
    }

    public function test_closed_blood_request_is_hidden_from_anonymous_users(): void
    {
        $bloodRequest = BloodRequest::factory()->completed()->create();

        $this->getJson("/api/blood-requests/{$bloodRequest->id}")
            ->assertNotFound();
    }

    public function test_invalid_blood_request_id_returns_404(): void
    {
        $this->getJson('/api/blood-requests/999999')
            ->assertNotFound();
    }

    public function test_authenticated_user_can_create_a_blood_request(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/blood-requests', [
            'blood_group' => 'AB-',
            'units' => 3,
            'hospital_or_location' => 'City General Hospital',
            'required_date' => now()->addDays(2)->format('Y-m-d'),
            'urgency' => BloodRequest::URGENCY_CRITICAL,
            'contact_name' => 'Ahmed',
            'contact_phone' => '+8801711111111',
            'notes' => 'Patient in ICU.',
        ])->assertCreated()
            ->assertJsonPath('data.blood_group', 'AB-')
            ->assertJsonPath('data.units', 3)
            ->assertJsonPath('data.status', BloodRequest::STATUS_ACTIVE)
            ->assertJsonPath('data.open', true)
            ->assertJsonPath('data.creator.id', $user->id);
    }

    public function test_blood_request_creation_validates_fields(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/blood-requests', [
            'blood_group' => 'ZZ',
            'hospital_or_location' => '',
            'contact_phone' => '',
            'required_date' => now()->subDays(1)->format('Y-m-d'),
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['blood_group', 'hospital_or_location', 'contact_phone', 'required_date']);
    }

    public function test_blood_request_creation_requires_authentication(): void
    {
        $this->postJson('/api/blood-requests', [
            'blood_group' => 'A+',
            'hospital_or_location' => 'City Hospital',
            'contact_phone' => '+8801711111111',
            'required_date' => now()->addDays(1)->format('Y-m-d'),
        ])->assertUnauthorized();
    }

    public function test_authenticated_user_can_respond_to_an_active_request(): void
    {
        $bloodRequest = BloodRequest::factory()->active()->create();
        $volunteer = User::factory()->create();
        Sanctum::actingAs($volunteer);

        $this->postJson("/api/blood-requests/{$bloodRequest->id}/responses", [
            'message' => 'I can donate on the required date.',
        ])->assertCreated()
            ->assertJsonPath('data.blood_request_id', $bloodRequest->id)
            ->assertJsonPath('data.user_id', $volunteer->id)
            ->assertJsonPath('data.message', 'I can donate on the required date.');

        $this->assertDatabaseHas('blood_request_responses', [
            'blood_request_id' => $bloodRequest->id,
            'user_id' => $volunteer->id,
        ]);
    }

    public function test_duplicate_response_from_the_same_user_is_rejected(): void
    {
        $bloodRequest = BloodRequest::factory()->active()->create();
        $volunteer = User::factory()->create();
        BloodRequestResponse::factory()->create([
            'blood_request_id' => $bloodRequest->id,
            'user_id' => $volunteer->id,
        ]);
        Sanctum::actingAs($volunteer);

        $this->postJson("/api/blood-requests/{$bloodRequest->id}/responses", [
            'message' => 'Second attempt.',
        ])->assertStatus(409)
            ->assertJsonPath('message', 'You have already responded to this blood request.');

        $this->assertDatabaseCount('blood_request_responses', 1);
    }

    public function test_creator_cannot_respond_to_their_own_request(): void
    {
        $creator = User::factory()->create();
        $bloodRequest = BloodRequest::factory()->active()->create([
            'created_by' => $creator->id,
        ]);
        Sanctum::actingAs($creator);

        $this->postJson("/api/blood-requests/{$bloodRequest->id}/responses", [
            'message' => 'I need my own blood?',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'You cannot respond to your own blood request.');
    }

    public function test_cannot_respond_to_completed_closed_cancelled_or_expired_requests(): void
    {
        $volunteer = User::factory()->create();
        Sanctum::actingAs($volunteer);

        foreach ([
            BloodRequest::STATUS_COMPLETED,
            BloodRequest::STATUS_CLOSED,
            BloodRequest::STATUS_CANCELLED,
            BloodRequest::STATUS_EXPIRED,
        ] as $status) {
            $bloodRequest = BloodRequest::factory()->create(['status' => $status]);

            $this->postJson("/api/blood-requests/{$bloodRequest->id}/responses", [
                'message' => 'Too late.',
            ])->assertStatus(409)
                ->assertJsonPath('message', 'This blood request is no longer accepting responses.');
        }
    }

    public function test_responding_requires_authentication(): void
    {
        $bloodRequest = BloodRequest::factory()->active()->create();

        $this->postJson("/api/blood-requests/{$bloodRequest->id}/responses", [
            'message' => 'Un-authenticated.',
        ])->assertUnauthorized();
    }

    public function test_creator_can_update_request_status(): void
    {
        $creator = User::factory()->create();
        $bloodRequest = BloodRequest::factory()->active()->create([
            'created_by' => $creator->id,
        ]);
        Sanctum::actingAs($creator);

        $this->patchJson("/api/blood-requests/{$bloodRequest->id}/status", [
            'status' => BloodRequest::STATUS_COMPLETED,
        ])->assertOk()
            ->assertJsonPath('data.status', BloodRequest::STATUS_COMPLETED)
            ->assertJsonPath('data.open', false);

        $this->assertDatabaseHas('blood_requests', [
            'id' => $bloodRequest->id,
            'status' => BloodRequest::STATUS_COMPLETED,
        ]);
    }

    public function test_unauthorized_user_cannot_update_another_persons_request(): void
    {
        $owner = User::factory()->create();
        $bloodRequest = BloodRequest::factory()->active()->create([
            'created_by' => $owner->id,
        ]);
        $intruder = User::factory()->create();
        Sanctum::actingAs($intruder);

        $this->patchJson("/api/blood-requests/{$bloodRequest->id}/status", [
            'status' => BloodRequest::STATUS_CANCELLED,
        ])->assertForbidden();

        $this->assertDatabaseHas('blood_requests', [
            'id' => $bloodRequest->id,
            'status' => BloodRequest::STATUS_ACTIVE,
        ]);
    }

    public function test_super_admin_can_update_any_request_status(): void
    {
        $owner = User::factory()->create();
        $bloodRequest = BloodRequest::factory()->active()->create([
            'created_by' => $owner->id,
        ]);
        $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        Sanctum::actingAs($superAdmin);

        $this->patchJson("/api/blood-requests/{$bloodRequest->id}/status", [
            'status' => BloodRequest::STATUS_CLOSED,
        ])->assertOk()
            ->assertJsonPath('data.status', BloodRequest::STATUS_CLOSED);
    }

    public function test_closed_request_cannot_be_reopened(): void
    {
        $creator = User::factory()->create();
        $bloodRequest = BloodRequest::factory()->cancelled()->create([
            'created_by' => $creator->id,
        ]);
        Sanctum::actingAs($creator);

        $this->patchJson("/api/blood-requests/{$bloodRequest->id}/status", [
            'status' => BloodRequest::STATUS_ACTIVE,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'A closed blood request cannot be reopened.');
    }

    public function test_invalid_status_value_is_rejected(): void
    {
        $creator = User::factory()->create();
        $bloodRequest = BloodRequest::factory()->active()->create([
            'created_by' => $creator->id,
        ]);
        Sanctum::actingAs($creator);

        $this->patchJson("/api/blood-requests/{$bloodRequest->id}/status", [
            'status' => 'unknown',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    public function test_user_can_list_their_own_blood_requests(): void
    {
        $user = User::factory()->create();
        BloodRequest::factory()->create(['created_by' => $user->id, 'status' => BloodRequest::STATUS_ACTIVE]);
        BloodRequest::factory()->create(['created_by' => $user->id, 'status' => BloodRequest::STATUS_COMPLETED]);
        BloodRequest::factory()->active()->create();

        Sanctum::actingAs($user);

        $this->getJson('/api/blood-requests/me')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}
