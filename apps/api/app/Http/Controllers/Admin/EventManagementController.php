<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEventRequest;
use App\Http\Requests\UpdateEventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\Mosque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class EventManagementController extends Controller
{
    public function index(Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('view', $mosque);

        $events = $mosque->events()
            ->with(['mosque', 'creator'])
            ->orderByDesc('event_date')
            ->orderByDesc('start_time')
            ->orderByDesc('id')
            ->get();

        return EventResource::collection($events);
    }

    public function store(StoreEventRequest $request, Mosque $mosque): JsonResponse
    {
        $event = $mosque->events()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
            'status' => $request->validated('status', Event::STATUS_DRAFT),
        ]);

        return (new EventResource($event->load(['mosque', 'creator'])))
            ->additional(['message' => 'Event created successfully.'])
            ->response()
            ->setStatusCode(201);
    }

    public function show(Mosque $mosque, Event $event): EventResource
    {
        Gate::authorize('view', $event);

        return new EventResource($event->load(['mosque', 'creator']));
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

        return (new EventResource($event->refresh()->load(['mosque', 'creator'])))
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
}
