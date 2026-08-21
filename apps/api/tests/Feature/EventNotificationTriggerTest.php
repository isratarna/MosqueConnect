<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventNotificationTriggerTest extends TestCase
{
    use RefreshDatabase;

    public function test_publishing_an_event_notifies_mosque_followers(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $follower = User::factory()->create();
        $nonFollower = User::factory()->create();
        Follower::factory()->create([
            'user_id' => $follower->id,
            'mosque_id' => $mosque->id,
        ]);
        $event = Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'title' => 'Community Quran Workshop',
            'status' => Event::STATUS_DRAFT,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}/publish")
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $follower->id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_EVENT,
            'title' => 'New Event: Community Quran Workshop',
            'message' => "{$mosque->name} published a new event: Community Quran Workshop.",
            'reference_type' => 'event',
            'reference_id' => $event->id,
            'is_read' => false,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $nonFollower->id,
            'reference_type' => 'event',
            'reference_id' => $event->id,
        ]);
    }

    public function test_creating_a_draft_event_does_not_notify_followers(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        Follower::factory()->create(['mosque_id' => $mosque->id]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/events", $this->eventPayload())
            ->assertCreated();

        $this->assertDatabaseCount('notifications', 0);
    }

    public function test_creating_an_event_as_published_notifies_followers(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $follower = Follower::factory()->create(['mosque_id' => $mosque->id]);
        Sanctum::actingAs($admin);

        $response = $this->postJson(
            "/api/admin/mosques/{$mosque->id}/events",
            $this->eventPayload(['status' => Event::STATUS_PUBLISHED]),
        )->assertCreated();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $follower->user_id,
            'type' => Notification::TYPE_EVENT,
            'reference_type' => 'event',
            'reference_id' => $response->json('data.id'),
        ]);
    }

    public function test_publishing_through_event_update_notifies_followers(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $follower = Follower::factory()->create(['mosque_id' => $mosque->id]);
        $event = Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'status' => Event::STATUS_DRAFT,
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}", [
            'status' => Event::STATUS_PUBLISHED,
        ])->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $follower->user_id,
            'type' => Notification::TYPE_EVENT,
            'reference_type' => 'event',
            'reference_id' => $event->id,
        ]);
    }

    public function test_repeated_publish_triggers_do_not_create_duplicate_notifications(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $follower = Follower::factory()->create(['mosque_id' => $mosque->id]);
        $event = Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'status' => Event::STATUS_DRAFT,
        ]);
        Sanctum::actingAs($admin);

        $url = "/api/admin/mosques/{$mosque->id}/events/{$event->id}/publish";
        $this->patchJson($url)->assertOk();
        $this->patchJson($url)->assertOk();

        $this->assertSame(1, Notification::query()
            ->where('user_id', $follower->user_id)
            ->where('type', Notification::TYPE_EVENT)
            ->where('reference_type', 'event')
            ->where('reference_id', $event->id)
            ->count());
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function eventPayload(array $overrides = []): array
    {
        return [
            'title' => 'Community Quran Workshop',
            'description' => 'A guided workshop for community members.',
            'category' => Event::CATEGORY_WORKSHOP,
            'event_date' => today()->addMonth()->toDateString(),
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
