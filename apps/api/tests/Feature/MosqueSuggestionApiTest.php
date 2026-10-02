<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\MosqueFacility;
use App\Models\MosqueSuggestion;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MosqueSuggestionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_submit_a_suggestion_and_list_their_own(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/mosque-suggestions', $this->payload([
            'facilities' => [MosqueFacility::WOMEN_AREA, MosqueFacility::WUDU],
        ]))->assertCreated()
            ->assertJsonPath('data.status', MosqueSuggestion::STATUS_PENDING)
            ->assertJsonPath('data.name', 'Suggested Mosque');

        $this->assertDatabaseHas('mosque_suggestions', [
            'id' => $response->json('data.id'),
            'user_id' => $user->id,
            'status' => MosqueSuggestion::STATUS_PENDING,
        ]);
        MosqueSuggestion::factory()->create(['user_id' => User::factory()->create()->id]);
        $this->getJson('/api/me/mosque-suggestions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $response->json('data.id'));
    }

    public function test_nearby_duplicate_returns_conflict_with_existing_mosque_id(): void
    {
        $existing = Mosque::factory()->create(['latitude' => 23.75, 'longitude' => 90.40]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/mosque-suggestions', $this->payload([
            'latitude' => 23.7501,
            'longitude' => 90.4001,
        ]))->assertStatus(409)
            ->assertJsonPath('mosque_id', $existing->id);

        $this->assertDatabaseCount('mosque_suggestions', 0);
    }

    public function test_super_admin_approval_creates_unverified_mosque_facilities_audit_and_notification(): void
    {
        $submitter = User::factory()->create();
        $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        $suggestion = MosqueSuggestion::factory()->create([
            'user_id' => $submitter->id,
            'name' => 'New Community Mosque',
            'latitude' => 22.30,
            'longitude' => 91.80,
            'facilities' => [MosqueFacility::WOMEN_AREA, MosqueFacility::PARKING],
        ]);
        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/super-admin/mosque-suggestions/{$suggestion->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', MosqueSuggestion::STATUS_APPROVED)
            ->assertJsonPath('data.mosque.name', 'New Community Mosque');
        $mosqueId = $response->json('data.mosque_id');

        $this->assertDatabaseHas('mosques', [
            'id' => $mosqueId,
            'verification_status' => Mosque::VERIFICATION_UNVERIFIED,
            'owner_id' => null,
        ]);
        $this->assertDatabaseHas('mosque_facilities', ['mosque_id' => $mosqueId, 'facility_key' => MosqueFacility::WOMEN_AREA]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'mosque_suggestion.approved',
            'target_id' => $suggestion->id,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $submitter->id,
            'mosque_id' => $mosqueId,
            'type' => Notification::TYPE_SYSTEM,
            'reference_type' => 'mosque_suggestion',
            'reference_id' => $suggestion->id,
        ]);
        Sanctum::actingAs($submitter);
        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.mosque.id', $mosqueId)
            ->assertJsonPath('data.0.type', Notification::TYPE_SYSTEM);
    }

    public function test_rejection_requires_note_and_notifies_submitter_without_a_mosque(): void
    {
        $submitter = User::factory()->create();
        $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        $suggestion = MosqueSuggestion::factory()->create(['user_id' => $submitter->id]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/super-admin/mosque-suggestions/{$suggestion->id}/reject", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('review_note');
        $this->patchJson("/api/super-admin/mosque-suggestions/{$suggestion->id}/reject", [
            'review_note' => 'A mosque already exists at this location.',
        ])->assertOk()
            ->assertJsonPath('data.status', MosqueSuggestion::STATUS_REJECTED)
            ->assertJsonPath('data.review_note', 'A mosque already exists at this location.');

        $this->assertDatabaseHas('notifications', [
            'user_id' => $submitter->id,
            'mosque_id' => null,
            'type' => Notification::TYPE_SYSTEM,
            'reference_type' => 'mosque_suggestion',
            'reference_id' => $suggestion->id,
        ]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'actor_id' => $admin->id,
            'action' => 'mosque_suggestion.rejected',
            'target_id' => $suggestion->id,
        ]);

        Sanctum::actingAs($submitter);
        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.mosque', null)
            ->assertJsonPath('data.0.type', Notification::TYPE_SYSTEM);
    }

    public function test_non_super_admin_cannot_review_suggestions(): void
    {
        $suggestion = MosqueSuggestion::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->patchJson("/api/super-admin/mosque-suggestions/{$suggestion->id}/approve")
            ->assertForbidden();
    }

    public function test_suggestion_submission_is_limited_to_five_per_minute(): void
    {
        Sanctum::actingAs(User::factory()->create());

        for ($index = 0; $index < 5; $index++) {
            $this->postJson('/api/mosque-suggestions', $this->payload([
                'latitude' => 22.0 + ($index * 0.1),
                'longitude' => 80.0,
            ]))->assertCreated();
        }

        $this->postJson('/api/mosque-suggestions', $this->payload([
            'latitude' => 23.0,
            'longitude' => 80.0,
        ]))->assertTooManyRequests();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Suggested Mosque',
            'address' => '10 Community Road, Chattogram, Bangladesh',
            'district' => 'Chattogram',
            'area' => 'Nasirabad',
            'latitude' => 22.36,
            'longitude' => 91.82,
            'phone' => '+880311234567',
            'facilities' => [],
            'notes' => 'Community members requested a listing.',
        ], $overrides);
    }
}
