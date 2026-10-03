<?php

namespace App\Http\Controllers;

use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Notification;
use App\Services\NotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EventRegistrationController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $registrations = $request->user()
            ->eventRegistrations()
            ->with([
                'event' => fn ($query) => $query->withCount(['registrations as registrations_count' => fn ($registrations) => $registrations->whereIn('status', [EventRegistration::STATUS_REGISTERED, EventRegistration::STATUS_ATTENDED])]),
                'event.mosque',
                'event.creator',
            ])
            ->latest()
            ->get();

        return response()->json([
            'data' => $registrations->map(fn (EventRegistration $registration): array => [
                'id' => $registration->id,
                'event_id' => $registration->event_id,
                'registered_at' => $registration->created_at?->toJSON(),
                'status' => $registration->status,
                'occurrence_date' => $registration->occurrence_date?->format('Y-m-d'),
                'ticket_code' => $registration->ticket_code,
                'checked_in_at' => $registration->checked_in_at?->toJSON(),
                'event' => new EventResource($registration->event),
            ]),
        ]);
    }

    public function store(Request $request, Event $event): JsonResponse
    {
        $validated = $request->validate([
            'occurrence_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ]);
        $userId = (int) $request->user()->id;
        $occurrenceDate = $validated['occurrence_date'] ?? $event->event_date->toDateString();

        if ($event->isRecurring() && $event->occurrencesBetween(
            CarbonImmutable::parse($occurrenceDate),
            CarbonImmutable::parse($occurrenceDate),
        )->isEmpty()) {
            throw ValidationException::withMessages(['occurrence_date' => 'The selected date is not an occurrence of this event.']);
        }

        if (! $event->isRecurring() && $occurrenceDate !== $event->event_date->toDateString()) {
            throw ValidationException::withMessages(['occurrence_date' => 'This event does not have an occurrence on the selected date.']);
        }

        try {
            $registration = DB::transaction(function () use ($event, $userId, $occurrenceDate): EventRegistration {
                /** @var Event $lockedEvent */
                $lockedEvent = Event::query()->lockForUpdate()->findOrFail($event->id);

                if (! $lockedEvent->registration_required
                    || $lockedEvent->status !== Event::STATUS_PUBLISHED
                    || $lockedEvent->moderation_status !== Event::MODERATION_APPROVED
                    || $occurrenceDate < today()->toDateString()) {
                    abort(409, $lockedEvent->registrationClosedMessage());
                }

                $existing = $lockedEvent->registrations()
                    ->where('user_id', $userId)
                    ->whereDate('occurrence_date', $occurrenceDate)
                    ->first();

                if ($existing && $existing->status !== EventRegistration::STATUS_CANCELLED) {
                    abort(409, 'You are already registered for this event.');
                }

                $activeCount = $lockedEvent->registrations()
                    ->whereDate('occurrence_date', $occurrenceDate)
                    ->whereIn('status', [EventRegistration::STATUS_REGISTERED, EventRegistration::STATUS_ATTENDED])
                    ->count();
                $status = $lockedEvent->capacity !== null && $activeCount >= $lockedEvent->capacity
                    ? EventRegistration::STATUS_WAITLISTED
                    : EventRegistration::STATUS_REGISTERED;
                $ticketCode = $this->newTicketCode($lockedEvent);

                if ($existing) {
                    $existing->update([
                        'status' => $status,
                        'ticket_code' => $ticketCode,
                        'checked_in_at' => null,
                    ]);

                    return $existing->refresh();
                }

                return $lockedEvent->registrations()->create([
                    'user_id' => $userId,
                    'status' => $status,
                    'occurrence_date' => $occurrenceDate,
                    'ticket_code' => $ticketCode,
                ]);
            }, 3);
        } catch (QueryException $exception) {
            if ($this->isUniqueConstraintViolation($exception)) {
                abort(409, 'You are already registered for this event.');
            }

            throw $exception;
        }

        return response()->json([
            'message' => $registration->status === EventRegistration::STATUS_WAITLISTED
                ? 'The event is full. You have been added to the waitlist.'
                : 'You are registered for this event.',
            'data' => [
                'id' => $registration->id,
                'event_id' => $registration->event_id,
                'user_id' => $registration->user_id,
                'status' => $registration->status,
                'occurrence_date' => $registration->occurrence_date?->format('Y-m-d'),
                'ticket_code' => $registration->ticket_code,
                'registered_at' => $registration->created_at?->toJSON(),
            ],
        ], 201);
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $occurrenceDate = $request->query('occurrence_date', $event->event_date->toDateString());
        $registration = $event->registrations()
            ->where('user_id', $request->user()->id)
            ->whereDate('occurrence_date', $occurrenceDate)
            ->whereIn('status', [EventRegistration::STATUS_REGISTERED, EventRegistration::STATUS_WAITLISTED])
            ->first();

        if (! $registration) {
            return response()->json(['message' => 'You are not registered for this event.'], 404);
        }

        DB::transaction(function () use ($registration, $event): void {
            $wasRegistered = $registration->status === EventRegistration::STATUS_REGISTERED;
            $registration->status = EventRegistration::STATUS_CANCELLED;
            $registration->save();

            if ($wasRegistered) {
                $this->promoteWaitlisted($event, $registration->occurrence_date?->toDateString() ?? $event->event_date->toDateString());
            }
        });

        return response()->json(['message' => 'Your registration was cancelled.']);
    }

    private function newTicketCode(Event $event): string
    {
        do {
            $code = Str::upper(Str::random(8));
        } while ($event->registrations()->where('ticket_code', $code)->exists());

        return $code;
    }

    private function promoteWaitlisted(Event $event, string $occurrenceDate): void
    {
        $activeCount = $event->registrations()
            ->whereDate('occurrence_date', $occurrenceDate)
            ->whereIn('status', [EventRegistration::STATUS_REGISTERED, EventRegistration::STATUS_ATTENDED])
            ->count();

        if ($event->capacity !== null && $activeCount >= $event->capacity) {
            return;
        }

        $next = $event->registrations()
            ->whereDate('occurrence_date', $occurrenceDate)
            ->where('status', EventRegistration::STATUS_WAITLISTED)
            ->with('user')
            ->orderBy('created_at')
            ->orderBy('id')
            ->first();

        if (! $next) {
            return;
        }

        $next->update(['status' => EventRegistration::STATUS_REGISTERED]);
        $this->notifications->notifyUser($next->user_id, $event->mosque, [
            'type' => Notification::TYPE_EVENT,
            'title' => 'Event registration confirmed',
            'message' => "A place is now available for {$event->title}.",
            'reference_type' => 'event_waitlist_promotion',
            'reference_id' => $next->id,
        ]);
    }

    private function isUniqueConstraintViolation(QueryException $exception): bool
    {
        return in_array((string) $exception->getCode(), ['19', '23000', '23505'], true);
    }
}
