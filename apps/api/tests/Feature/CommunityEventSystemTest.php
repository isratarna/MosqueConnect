<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommunityEventSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_event_list_only_returns_published_events_in_schedule_order(): void
    {
        $mosque = Mosque::factory()->create();
        $creator = User::factory()->create();
        $later = Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $creator->id,
            'event_date' => '2026-09-02',
            'start_time' => '18:00',
        ]);
        $earlier = Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $creator->id,
            'event_date' => '2026-09-01',
            'start_time' => '10:00',
        ]);
        Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $creator->id,
            'status' => Event::STATUS_DRAFT,
        ]);
        Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $creator->id,
            'status' => Event::STATUS_CANCELLED,
        ]);

        $this->getJson('/api/events')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $earlier->id)
            ->assertJsonPath('data.1.id', $later->id)
            ->assertJsonPath('data.0.mosque.id', $mosque->id);
    }

    public function test_published_event_details_include_mosque_and_normalized_event_data(): void
    {
        $event = Event::factory()->published()->create([
            'category' => Event::CATEGORY_QURAN_PROGRAM,
            'event_date' => '2026-09-12',
            'start_time' => '09:30',
            'end_time' => '11:00',
            'capacity' => 75,
            'registration_required' => true,
        ]);

        $this->getJson("/api/events/{$event->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $event->id)
            ->assertJsonPath('data.category', Event::CATEGORY_QURAN_PROGRAM)
            ->assertJsonPath('data.event_date', '2026-09-12')
            ->assertJsonPath('data.start_time', '09:30')
            ->assertJsonPath('data.end_time', '11:00')
            ->assertJsonPath('data.capacity', 75)
            ->assertJsonPath('data.registration_required', true)
            ->assertJsonPath('data.mosque.id', $event->mosque_id);
    }

    public function test_unpublished_event_details_are_not_publicly_visible(): void
    {
        $event = Event::factory()->create(['status' => Event::STATUS_DRAFT]);

        $this->getJson("/api/events/{$event->id}")->assertNotFound();
    }

    public function test_missing_public_event_returns_not_found(): void
    {
        $this->getJson('/api/events/999999')->assertNotFound();
    }

    public function test_unauthenticated_user_cannot_create_an_event(): void
    {
        $mosque = Mosque::factory()->create();

        $this->postJson("/api/admin/mosques/{$mosque->id}/events", $this->validPayload())
            ->assertUnauthorized();
    }

    public function test_normal_user_cannot_create_an_event(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_NORMAL_USER]));
        $mosque = Mosque::factory()->create();

        $this->postJson("/api/admin/mosques/{$mosque->id}/events", $this->validPayload())
            ->assertForbidden();
    }

    public function test_authenticated_event_creation_for_a_missing_mosque_returns_not_found(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]));

        $this->postJson('/api/admin/mosques/999999/events', $this->validPayload())
            ->assertNotFound();
    }

    public function test_verified_mosque_admin_can_create_an_event_for_their_mosque(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/events", $this->validPayload([
            'status' => Event::STATUS_PUBLISHED,
        ]))->assertCreated()
            ->assertJsonPath('message', 'Event created successfully.')
            ->assertJsonPath('data.mosque_id', $mosque->id)
            ->assertJsonPath('data.created_by', $admin->id)
            ->assertJsonPath('data.status', Event::STATUS_PUBLISHED)
            ->assertJsonPath('data.mosque.id', $mosque->id)
            ->assertJsonPath('data.creator.id', $admin->id);

        $this->assertDatabaseHas('events', [
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'title' => 'Community Quran Workshop',
            'status' => Event::STATUS_PUBLISHED,
        ]);
    }

    public function test_new_event_defaults_to_draft_status(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        Sanctum::actingAs($admin);

        $payload = $this->validPayload();
        unset($payload['status']);

        $this->postJson("/api/admin/mosques/{$mosque->id}/events", $payload)
            ->assertCreated()
            ->assertJsonPath('data.status', Event::STATUS_DRAFT);
    }

    public function test_mosque_admin_cannot_create_an_event_for_another_mosque(): void
    {
        [$admin] = $this->verifiedAdminAndMosque();
        $otherMosque = Mosque::factory()->create([
            'owner_id' => User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN])->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$otherMosque->id}/events", $this->validPayload())
            ->assertForbidden();

        $this->assertDatabaseCount('events', 0);
    }

    public function test_mosque_admin_cannot_create_events_until_their_mosque_is_verified(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_PENDING,
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/events", $this->validPayload())
            ->assertForbidden()
            ->assertJsonPath('message', 'Mosque administration is not available until the mosque is verified.');
    }

    public function test_super_admin_can_create_an_event_for_any_mosque_using_existing_rules(): void
    {
        $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        $mosque = Mosque::factory()->create([
            'verification_status' => Mosque::VERIFICATION_PENDING,
        ]);
        Sanctum::actingAs($superAdmin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/events", $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('data.created_by', $superAdmin->id);
    }

    public function test_event_creation_validates_required_fields_category_date_time_capacity_and_status(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/events", [
            'title' => '',
            'description' => ['not', 'text'],
            'category' => 'Unsupported Category',
            'event_date' => 'not-a-date',
            'start_time' => '25:00',
            'end_time' => '08:00',
            'capacity' => -1,
            'status' => Event::STATUS_COMPLETED,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'title',
                'description',
                'category',
                'event_date',
                'start_time',
                'end_time',
                'location',
                'capacity',
                'status',
            ]);

        $this->assertDatabaseCount('events', 0);
    }

    public function test_event_creation_rejects_an_end_time_before_the_start_time(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/events", $this->validPayload([
            'start_time' => '10:00',
            'end_time' => '09:59',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['end_time']);

        $this->assertDatabaseCount('events', 0);
    }

    public function test_route_ownership_cannot_be_overridden_by_mosque_or_creator_input(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $otherMosque = Mosque::factory()->create();
        $otherUser = User::factory()->create();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/events", $this->validPayload([
            'mosque_id' => $otherMosque->id,
            'created_by' => $otherUser->id,
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['mosque_id', 'created_by']);

        $this->assertDatabaseCount('events', 0);
    }

    public function test_admin_can_list_and_update_their_mosques_events(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $event = Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
        ]);
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$mosque->id}/events")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $event->id);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}", [
            'title' => 'Updated Event Title',
            'capacity' => 0,
        ])->assertOk()
            ->assertJsonPath('data.title', 'Updated Event Title')
            ->assertJsonPath('data.capacity', 0);
    }

    public function test_admin_cannot_manage_another_mosques_event(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $otherAdmin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $otherMosque = Mosque::factory()->create([
            'owner_id' => $otherAdmin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $event = Event::factory()->create([
            'mosque_id' => $otherMosque->id,
            'created_by' => $otherAdmin->id,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$otherMosque->id}/events/{$event->id}", [
            'title' => 'Unauthorized Change',
        ])->assertForbidden();

        $this->assertDatabaseMissing('events', [
            'id' => $event->id,
            'title' => 'Unauthorized Change',
        ]);
        $this->assertSame($mosque->owner_id, $admin->id);
    }

    public function test_normal_user_cannot_update_or_cancel_an_event(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $event = Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
        ]);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_NORMAL_USER]));

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}", [
            'status' => Event::STATUS_CANCELLED,
        ])->assertForbidden();

        $this->assertDatabaseHas('events', [
            'id' => $event->id,
            'status' => Event::STATUS_PUBLISHED,
        ]);
    }

    public function test_scoped_binding_rejects_an_event_from_a_different_mosque(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $otherMosque = Mosque::factory()->create();
        $event = Event::factory()->create(['mosque_id' => $otherMosque->id]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}", [
            'title' => 'Cross Mosque Update',
        ])->assertNotFound();
    }

    public function test_event_end_time_is_validated_against_existing_or_updated_start_time(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $event = Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'start_time' => '10:00',
            'end_time' => '12:00',
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}", [
            'end_time' => '09:59',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['end_time']);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}", [
            'start_time' => '13:00',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['end_time']);
    }

    public function test_allowed_event_status_transitions_succeed(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        Sanctum::actingAs($admin);

        $event = Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'status' => Event::STATUS_DRAFT,
        ]);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}", [
            'status' => Event::STATUS_PUBLISHED,
        ])->assertOk()
            ->assertJsonPath('data.status', Event::STATUS_PUBLISHED);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}", [
            'status' => Event::STATUS_COMPLETED,
        ])->assertOk()
            ->assertJsonPath('data.status', Event::STATUS_COMPLETED);

        $cancellable = Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
        ]);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$cancellable->id}", [
            'status' => Event::STATUS_CANCELLED,
        ])->assertOk()
            ->assertJsonPath('data.status', Event::STATUS_CANCELLED);
    }

    public function test_invalid_event_status_transition_is_rejected_without_changing_the_event(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $event = Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'status' => Event::STATUS_DRAFT,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}", [
            'status' => Event::STATUS_COMPLETED,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);

        $this->assertDatabaseHas('events', [
            'id' => $event->id,
            'status' => Event::STATUS_DRAFT,
        ]);
    }

    public function test_authorized_admin_can_delete_event_but_normal_user_cannot(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $event = Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_NORMAL_USER]));
        $this->deleteJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}")
            ->assertForbidden();

        Sanctum::actingAs($admin);
        $this->deleteJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Event deleted successfully.');

        $this->assertDatabaseMissing('events', ['id' => $event->id]);
    }

    public function test_event_relationships_connect_mosque_and_creator(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $event = Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
        ]);

        $this->assertTrue($mosque->events->contains($event));
        $this->assertTrue($admin->createdEvents->contains($event));
        $this->assertTrue($event->mosque->is($mosque));
        $this->assertTrue($event->creator->is($admin));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function validPayload(array $overrides = []): array
    {
        return [
            'title' => 'Community Quran Workshop',
            'description' => 'A guided workshop for community members of all experience levels.',
            'category' => Event::CATEGORY_WORKSHOP,
            'event_date' => '2026-09-15',
            'start_time' => '10:00',
            'end_time' => '12:00',
            'location' => 'Main prayer hall',
            'capacity' => 100,
            'registration_required' => true,
            'status' => Event::STATUS_DRAFT,
            ...$overrides,
        ];
    }

    /**
     * @return array{User, Mosque}
     */
    private function verifiedAdminAndMosque(): array
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);

        return [$admin, $mosque];
    }
}
