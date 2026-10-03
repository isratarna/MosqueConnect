<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Mosque;
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

    public function test_recurring_event_registration_is_unique_per_occurrence(): void
    {
        $event = $this->registrableEvent([
            'event_date' => today()->addDay()->toDateString(),
            'recurrence_rule' => 'FREQ=DAILY',
        ]);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $firstDate = $event->event_date->toDateString();
        $secondDate = $event->event_date->addDay()->toDateString();
        $this->postJson("/api/events/{$event->id}/register", ['occurrence_date' => $firstDate])->assertCreated();
        $this->postJson("/api/events/{$event->id}/register", ['occurrence_date' => $secondDate])->assertCreated();
        $this->postJson("/api/events/{$event->id}/register", ['occurrence_date' => $firstDate])->assertConflict();

        $this->assertSame(2, EventRegistration::query()->where('event_id', $event->id)->where('user_id', $user->id)->count());
    }

    public function test_full_and_zero_capacity_events_add_registrations_to_waitlist(): void
    {
        $fullEvent = $this->registrableEvent(['capacity' => 1]);
        $fullEvent->registrations()->create([
            'user_id' => User::factory()->create()->id,
            'occurrence_date' => $fullEvent->event_date->toDateString(),
        ]);
        $zeroCapacityEvent = $this->registrableEvent(['capacity' => 0]);
        Sanctum::actingAs(User::factory()->create());

        foreach ([$fullEvent, $zeroCapacityEvent] as $event) {
            $this->postJson("/api/events/{$event->id}/register")
                ->assertCreated()
                ->assertJsonPath('data.status', EventRegistration::STATUS_WAITLISTED);
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
        $this->assertDatabaseHas('event_registrations', ['event_id' => $event->id, 'user_id' => $user->id, 'status' => EventRegistration::STATUS_CANCELLED]);
    }

    public function test_cancelling_a_confirmed_registration_promotes_the_oldest_waitlisted_user(): void
    {
        $event = $this->registrableEvent(['capacity' => 1]);
        $first = User::factory()->create();
        $second = User::factory()->create();
        Sanctum::actingAs($first);
        $confirmed = $this->postJson("/api/events/{$event->id}/register")->assertCreated()->json('data');

        Sanctum::actingAs($second);
        $waitlisted = $this->postJson("/api/events/{$event->id}/register")->assertCreated()->json('data');
        $this->assertSame(EventRegistration::STATUS_WAITLISTED, $waitlisted['status']);

        Sanctum::actingAs($first);
        $this->deleteJson("/api/events/{$event->id}/register?occurrence_date={$event->event_date->toDateString()}")->assertOk();

        $this->assertDatabaseHas('event_registrations', ['id' => $confirmed['id'], 'status' => EventRegistration::STATUS_CANCELLED]);
        $this->assertDatabaseHas('event_registrations', ['id' => $waitlisted['id'], 'status' => EventRegistration::STATUS_REGISTERED]);
        $this->assertDatabaseHas('notifications', ['user_id' => $second->id, 'reference_type' => 'event_waitlist_promotion']);
    }

    public function test_mosque_admin_can_list_check_in_and_export_attendees(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $event = $this->registrableEvent(['mosque_id' => $mosque->id]);
        $attendee = User::factory()->create(['name' => 'Attendee Search Name', 'phone' => '+8801712345678']);
        Sanctum::actingAs($attendee);
        $registration = $this->postJson("/api/events/{$event->id}/register")->assertCreated()->json('data');
        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}/registrations?search=Attendee")
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Attendee Search Name')
            ->assertJsonPath('data.0.ticket_code', $registration['ticket_code']);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}/registrations/{$registration['id']}/check-in")
            ->assertOk()
            ->assertJsonPath('data.status', EventRegistration::STATUS_ATTENDED);

        $this->postJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}/check-in", ['code' => $registration['ticket_code']])
            ->assertOk()
            ->assertJsonPath('data.status', EventRegistration::STATUS_REGISTERED);

        $csv = $this->get("/api/admin/mosques/{$mosque->id}/events/{$event->id}/registrations/export");
        $csv->assertOk()->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv->streamedContent());
        $this->assertStringContainsString('Attendee Search Name', $csv->streamedContent());
    }

    public function test_event_changes_and_cancellation_notify_registered_attendees(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create(['owner_id' => $admin->id, 'verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $event = $this->registrableEvent(['mosque_id' => $mosque->id]);
        $attendee = User::factory()->create();
        Sanctum::actingAs($attendee);
        $this->postJson("/api/events/{$event->id}/register")->assertCreated();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}", ['location' => 'New hall'])->assertOk();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}/cancel")->assertOk();

        $this->assertDatabaseHas('notifications', ['user_id' => $attendee->id, 'reference_type' => 'event_changed']);
        $this->assertDatabaseHas('notifications', ['user_id' => $attendee->id, 'reference_type' => 'event_cancelled']);
    }

    public function test_daily_event_reminder_notifies_attendees_for_tomorrow(): void
    {
        $event = $this->registrableEvent(['event_date' => today()->addDay()->toDateString()]);
        $attendee = User::factory()->create();
        Sanctum::actingAs($attendee);
        $registration = $this->postJson("/api/events/{$event->id}/register")->assertCreated()->json('data');

        $this->artisan('events:send-reminders')->assertSuccessful();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $attendee->id,
            'reference_type' => 'event_reminder_'.today()->addDay()->toDateString(),
            'reference_id' => $registration['id'],
        ]);
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
