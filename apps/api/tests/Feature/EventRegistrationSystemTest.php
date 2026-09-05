<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventRegistrationSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_requires_authentication(): void
    {
        $event = $this->registrableEvent();

        $this->postJson("/api/events/{$event->id}/register")->assertUnauthorized();
        $this->deleteJson("/api/events/{$event->id}/register")->assertUnauthorized();
        $this->getJson('/api/me/event-registrations')->assertUnauthorized();
    }

    public function test_user_can_register_and_database_and_capacity_fields_are_updated(): void
    {
        $user = User::factory()->create();
        $event = $this->registrableEvent(['capacity' => 2]);
        Sanctum::actingAs($user);

        $this->postJson("/api/events/{$event->id}/register")
            ->assertCreated()
            ->assertJsonPath('data.event_id', $event->id)
            ->assertJsonPath('data.user_id', $user->id);

        $this->assertDatabaseHas('event_registrations', [
            'event_id' => $event->id,
            'user_id' => $user->id,
        ]);

        $this->getJson("/api/events/{$event->id}")
            ->assertOk()
            ->assertJsonPath('data.registrations_count', 1)
            ->assertJsonPath('data.remaining_capacity', 1)
            ->assertJsonPath('data.is_full', false);
    }

    public function test_duplicate_registration_returns_conflict_without_duplicate_row(): void
    {
        $user = User::factory()->create();
        $event = $this->registrableEvent();
        Sanctum::actingAs($user);

        $this->postJson("/api/events/{$event->id}/register")->assertCreated();
        $this->postJson("/api/events/{$event->id}/register")
            ->assertConflict()
            ->assertJsonPath('message', 'You are already registered for this event.');

        $this->assertSame(1, EventRegistration::query()->where('event_id', $event->id)->where('user_id', $user->id)->count());
    }

    public function test_full_and_zero_capacity_events_reject_registration(): void
    {
        $fullEvent = $this->registrableEvent(['capacity' => 1]);
        $fullEvent->registrations()->create(['user_id' => User::factory()->create()->id]);
        $zeroCapacityEvent = $this->registrableEvent(['capacity' => 0]);
        Sanctum::actingAs(User::factory()->create());

        foreach ([$fullEvent, $zeroCapacityEvent] as $event) {
            $this->postJson("/api/events/{$event->id}/register")
                ->assertConflict()
                ->assertJsonPath('message', 'This event is full.');
        }
    }

    public function test_unlimited_capacity_accepts_multiple_users(): void
    {
        $event = $this->registrableEvent(['capacity' => null]);

        foreach (User::factory()->count(3)->create() as $user) {
            Sanctum::actingAs($user);
            $this->postJson("/api/events/{$event->id}/register")->assertCreated();
        }

        $this->assertSame(3, $event->registrations()->count());
        $this->getJson("/api/events/{$event->id}")
            ->assertJsonPath('data.remaining_capacity', null)
            ->assertJsonPath('data.is_full', false);
    }

    public function test_registration_rejects_events_that_are_not_open(): void
    {
        $events = [
            $this->registrableEvent(['registration_required' => false]),
            $this->registrableEvent(['status' => Event::STATUS_DRAFT]),
            $this->registrableEvent(['status' => Event::STATUS_CANCELLED]),
            $this->registrableEvent(['status' => Event::STATUS_COMPLETED]),
            $this->registrableEvent(['event_date' => today()->subDay()->toDateString()]),
            $this->registrableEvent(['moderation_status' => Event::MODERATION_REJECTED]),
        ];
        Sanctum::actingAs(User::factory()->create());

        foreach ($events as $event) {
            $this->postJson("/api/events/{$event->id}/register")->assertConflict();
        }

        $this->assertDatabaseCount('event_registrations', 0);
    }

    public function test_user_can_cancel_only_their_own_registration(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $event = $this->registrableEvent();
        $event->registrations()->create(['user_id' => $otherUser->id]);
        Sanctum::actingAs($user);

        $this->deleteJson("/api/events/{$event->id}/register")
            ->assertNotFound()
            ->assertJsonPath('message', 'You are not registered for this event.');
        $this->assertDatabaseHas('event_registrations', ['event_id' => $event->id, 'user_id' => $otherUser->id]);

        $this->postJson("/api/events/{$event->id}/register")->assertCreated();
        $this->deleteJson("/api/events/{$event->id}/register")
            ->assertOk()
            ->assertJsonPath('message', 'Your registration was cancelled.');
        $this->assertDatabaseMissing('event_registrations', ['event_id' => $event->id, 'user_id' => $user->id]);
    }

    public function test_current_user_registration_list_is_isolated_and_restores_event_data(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $mine = $this->registrableEvent(['title' => 'My registered event']);
        $other = $this->registrableEvent(['title' => 'Another registration']);
        $mine->registrations()->create(['user_id' => $user->id]);
        $other->registrations()->create(['user_id' => $otherUser->id]);
        Sanctum::actingAs($user);

        $this->getJson('/api/me/event-registrations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.event_id', $mine->id)
            ->assertJsonPath('data.0.event.title', 'My registered event')
            ->assertJsonPath('data.0.event.registrations_count', 1)
            ->assertJsonPath('data.0.event.remaining_capacity', 9);
    }

    public function test_deleting_an_event_cascades_its_registrations(): void
    {
        $event = $this->registrableEvent();
        $event->registrations()->create(['user_id' => User::factory()->create()->id]);

        $event->delete();

        $this->assertDatabaseCount('event_registrations', 0);
    }

    private function registrableEvent(array $overrides = []): Event
    {
        return Event::factory()->published()->create([
            'event_date' => today()->addDay()->toDateString(),
            'registration_required' => true,
            'capacity' => 10,
            ...$overrides,
        ]);
    }
}
