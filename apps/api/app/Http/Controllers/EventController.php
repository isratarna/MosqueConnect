<?php

namespace App\Http\Controllers;

use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EventController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $events = Event::query()
            ->published()
            ->with('mosque')
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->orderBy('id')
            ->get();

        return EventResource::collection($events);
    }

    public function show(Event $event): EventResource
    {
        abort_unless($event->status === Event::STATUS_PUBLISHED, 404);

        return new EventResource($event->load('mosque'));
    }
}
