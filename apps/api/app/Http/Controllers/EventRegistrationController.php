<?php

namespace App\Http\Controllers;

use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\EventRegistration;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventRegistrationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $registrations = $request->user()
            ->eventRegistrations()
            ->with([
                'event' => fn ($query) => $query->withCount('registrations'),
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
                'event' => new EventResource($registration->event),
            ]),
        ]);
    }

    public function store(Request $request, Event $event): JsonResponse
    {
        $userId = (int) $request->user()->id;

        try {
            $registration = DB::transaction(function () use ($event, $userId): EventRegistration {
                /** @var Event $lockedEvent */
                $lockedEvent = Event::query()->lockForUpdate()->findOrFail($event->id);

                if (! $lockedEvent->isRegistrationOpen()) {
                    abort(409, $lockedEvent->registrationClosedMessage());
                }

                if ($lockedEvent->registrations()->where('user_id', $userId)->exists()) {
                    abort(409, 'You are already registered for this event.');
                }

                if ($lockedEvent->capacity !== null && $lockedEvent->registrations()->count() >= $lockedEvent->capacity) {
                    abort(409, 'This event is full.');
                }

                return $lockedEvent->registrations()->create(['user_id' => $userId]);
            }, 3);
        } catch (QueryException $exception) {
            if ($this->isUniqueConstraintViolation($exception)) {
                abort(409, 'You are already registered for this event.');
            }

            throw $exception;
        }

        return response()->json([
            'message' => 'You are registered for this event.',
            'data' => [
                'id' => $registration->id,
                'event_id' => $registration->event_id,
                'user_id' => $registration->user_id,
                'registered_at' => $registration->created_at?->toJSON(),
            ],
        ], 201);
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $registration = $event->registrations()
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $registration) {
            return response()->json(['message' => 'You are not registered for this event.'], 404);
        }

        $registration->delete();

        return response()->json(['message' => 'Your registration was cancelled.']);
    }

    private function isUniqueConstraintViolation(QueryException $exception): bool
    {
        return in_array((string) $exception->getCode(), ['19', '23000', '23505'], true);
    }
}
