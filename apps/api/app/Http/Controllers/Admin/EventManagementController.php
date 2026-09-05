<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\EventIndexRequest;
use App\Http\Requests\StoreEventRequest;
use App\Http\Requests\UpdateEventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\Mosque;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class EventManagementController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(EventIndexRequest $request, Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('view', $mosque);

        $filters = $request->validated();

        $events = $mosque->events()
            ->with(['mosque', 'creator'])
            ->withCount('registrations')
            ->filter($filters)
            ->orderByDesc('event_date')
            ->orderByDesc('start_time')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 15))
            ->withQueryString();

        return EventResource::collection($events);
    }

    public function store(StoreEventRequest $request, Mosque $mosque): JsonResponse
    {
        $event = $mosque->events()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'status' => $request->validated('status', Event::STATUS_DRAFT),
        ]);

        if ($event->status === Event::STATUS_PUBLISHED) {
            $this->notifications->notifyEventPublished($event);
        }

        return (new EventResource($event->load(['mosque', 'creator'])->loadCount('registrations')))
            ->additional(['message' => 'Event created successfully.'])
            ->response()
            ->setStatusCode(201);
    }

    public function show(Mosque $mosque, Event $event): EventResource
    {
        Gate::authorize('view', $event);

        return new EventResource($event->load(['mosque', 'creator'])->loadCount('registrations'));
    }

    public function update(UpdateEventRequest $request, Mosque $mosque, Event $event): EventResource
    {
        $validated = $request->validated();
        $status = $validated['status'] ?? null;
        unset($validated['status']);

        $event->fill($validated);

        if ($status !== null) {
            $event->transitionTo($status);
        }

        $event->save();

        if ($event->wasChanged('status') && $event->status === Event::STATUS_PUBLISHED) {
            $this->notifications->notifyEventPublished($event);
        }

        return (new EventResource($event->refresh()->load(['mosque', 'creator'])->loadCount('registrations')))
            ->additional(['message' => 'Event updated successfully.']);
    }

    public function destroy(Mosque $mosque, Event $event): JsonResponse
    {
        Gate::authorize('delete', $event);

        $event->delete();

        return response()->json([
            'message' => 'Event deleted successfully.',
        ]);
    }

    public function publish(Mosque $mosque, Event $event): EventResource
    {
        return $this->transition($event, Event::STATUS_PUBLISHED, 'Event published successfully.');
    }

    public function cancel(Mosque $mosque, Event $event): EventResource
    {
        return $this->transition($event, Event::STATUS_CANCELLED, 'Event cancelled successfully.');
    }

    private function transition(Event $event, string $status, string $message): EventResource
    {
        Gate::authorize('update', $event);

        if (! $event->canTransitionTo($status)) {
            throw ValidationException::withMessages([
                'status' => "The event status cannot transition from {$event->status} to {$status}.",
            ]);
        }

        $event->transitionTo($status);
        $event->save();

        if ($event->wasChanged('status') && $event->status === Event::STATUS_PUBLISHED) {
            $this->notifications->notifyEventPublished($event);
        }

        return (new EventResource($event->refresh()->load(['mosque', 'creator'])->loadCount('registrations')))
            ->additional(['message' => $message]);
    }
}
