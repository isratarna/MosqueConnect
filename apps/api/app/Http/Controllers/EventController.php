<?php

namespace App\Http\Controllers;

use App\Http\Requests\EventIndexRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\EventRegistration;
use Carbon\CarbonImmutable;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;

class EventController extends Controller
{
    public function index(EventIndexRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        if ($request->filled('from') || $request->filled('to')) {
            $start = CarbonImmutable::parse($request->input('from', today()->toDateString()));
            $end = CarbonImmutable::parse($request->input('to', $start->addMonths(6)->toDateString()));
            abort_if($end->gt($start->addMonths(6)), 422, 'The event date window cannot exceed six months.');

            $expanded = Event::query()
                ->published()
                ->with(['mosque', 'creator'])
                ->withCount(['registrations as registrations_count' => fn ($query) => $query->whereIn('status', [EventRegistration::STATUS_REGISTERED, EventRegistration::STATUS_ATTENDED])])
                ->where(function ($query) use ($start, $end): void {
                    $query->whereBetween('event_date', [$start->toDateString(), $end->toDateString()])
                        ->orWhere(function ($recurring) use ($start, $end): void {
                            $recurring->whereNotNull('recurrence_rule')
                                ->whereDate('event_date', '<=', $end->toDateString())
                                ->where(function ($until) use ($start): void {
                                    $until->whereNull('recurrence_until')->orWhereDate('recurrence_until', '>=', $start->toDateString());
                                });
                        });
                })
                ->filter($filters)
                ->get()
                ->flatMap(fn (Event $event): Collection => $this->expandEventOccurrences($event, $start, $end))
                ->sortBy([['event_date', 'asc'], ['start_time', 'asc'], ['id', 'asc']])
                ->take(100)
                ->values();

            return EventResource::collection($expanded);
        }

        $events = Event::query()
            ->published()
            ->with(['mosque', 'creator'])
            ->withCount(['registrations as registrations_count' => fn ($query) => $query->whereIn('status', [EventRegistration::STATUS_REGISTERED, EventRegistration::STATUS_ATTENDED])])
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
        abort_unless(
            $event->status === Event::STATUS_PUBLISHED
                && $event->moderation_status === Event::MODERATION_APPROVED,
            404,
        );

        return new EventResource($event->load(['mosque', 'creator'])->loadCount('registrations'));
    }

    public function exportIcs(Event $event): Response
    {
        abort_unless(
            $event->status === Event::STATUS_PUBLISHED
                && $event->moderation_status === Event::MODERATION_APPROVED,
            404,
        );

        $timezone = 'Asia/Dhaka';
        $start = CarbonImmutable::parse($event->event_date->toDateString().' '.$event->start_time, $timezone);
        $end = $event->end_time ? CarbonImmutable::parse($event->event_date->toDateString().' '.$event->end_time, $timezone) : $start->addHour();
        $escape = fn (?string $value): string => str_replace(['\\', ';', ',', "\r\n", "\n", "\r"], ['\\\\', '\\;', '\\,', '\\n', '\\n', ''], (string) $value);
        $summary = $escape($event->title);
        $location = $escape($event->location);
        $description = $escape($event->description);
        $calendarRule = $this->calendarRecurrenceRule($event);
        $rrule = $calendarRule ? "RRULE:{$calendarRule}\r\n" : '';

        $ics = "BEGIN:VCALENDAR\r\n"
            ."VERSION:2.0\r\n"
            ."PRODID:-//MosqueConnect//EN\r\n"
            ."BEGIN:VEVENT\r\n"
            ."UID:{$event->id}@mosqueconnect\r\n"
            .'DTSTAMP:'.now('UTC')->format('Ymd\\THis\\Z')."\r\n"
            ."DTSTART;TZID={$timezone}:".$start->format('Ymd\\THis')."\r\n"
            ."DTEND;TZID={$timezone}:".$end->format('Ymd\\THis')."\r\n"
            ."SUMMARY:{$summary}\r\n"
            .($location !== '' ? "LOCATION:{$location}\r\n" : '')
            .($description !== '' ? "DESCRIPTION:{$description}\r\n" : '')
            .'URL:'.url('/events/'.$event->id)."\r\n"
            .($rrule !== '' ? $rrule : '')
            ."END:VEVENT\r\n"
            ."END:VCALENDAR\r\n";

        return response($ics, 200, ['Content-Type' => 'text/calendar; charset=utf-8', 'Content-Disposition' => 'attachment; filename="event-'.$event->id.'.ics"']);
    }

    /**
     * @return Collection<int, Event>
     */
    protected function expandEventOccurrences(Event $event, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        $occurrences = $event->occurrencesBetween($start, $end);

        if ($occurrences->isEmpty()) {
            return collect();
        }

        return $occurrences->map(function (CarbonImmutable $occurrence) use ($event): Event {
            $cloned = clone $event;
            $cloned->event_date = $occurrence->toDateString();
            $cloned->setAttribute('occurrence_date', $occurrence->toDateString());
            $cloned->setAttribute('registrations_count', $event->registrations()
                ->whereDate('occurrence_date', $occurrence->toDateString())
                ->whereIn('status', [EventRegistration::STATUS_REGISTERED, EventRegistration::STATUS_ATTENDED])
                ->count());
            $cloned->setRelation('mosque', $event->getRelation('mosque'));
            $cloned->setRelation('creator', $event->getRelation('creator'));

            return $cloned;
        });
    }

    private function calendarRecurrenceRule(Event $event): ?string
    {
        if (! $event->recurrence_rule) {
            return null;
        }

        $parts = [];
        foreach (explode(';', $event->recurrence_rule) as $segment) {
            [$key, $value] = explode('=', $segment, 2);
            $parts[strtoupper($key)] = strtoupper($value);
        }

        $ruleUntil = $parts['UNTIL'] ?? null;
        $untilDate = $event->recurrence_until?->format('Ymd');
        if ($ruleUntil && $untilDate) {
            $untilDate = min($untilDate, $ruleUntil);
        } else {
            $untilDate ??= $ruleUntil;
        }

        if ($untilDate) {
            $parts['UNTIL'] = CarbonImmutable::createFromFormat('!Ymd', $untilDate, 'Asia/Dhaka')
                ->endOfDay()
                ->utc()
                ->format('Ymd\\THis\\Z');
        }

        return implode(';', array_map(fn (string $key, string $value): string => "{$key}={$value}", array_keys($parts), array_values($parts)));
    }
}
