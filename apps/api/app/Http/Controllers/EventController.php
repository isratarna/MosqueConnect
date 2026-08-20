<?php

namespace App\Http\Controllers;

use App\Http\Requests\EventIndexRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EventController extends Controller
{
    public function index(EventIndexRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $events = Event::query()
            ->published()
            ->with(['mosque', 'creator'])
            ->filter($filters)
            ->orderByRaw('CASE WHEN event_date >= ? THEN 0 ELSE 1 END', [today()->toDateString()])
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->orderBy('id')
            ->paginate($request->integer('per_page', 15))
            ->withQueryString();

        return EventResource::collection($events);
    }

    public function show(Event $event): EventResource
    {
        abort_unless($event->status === Event::STATUS_PUBLISHED, 404);

        return new EventResource($event->load(['mosque', 'creator']));
    }
}
