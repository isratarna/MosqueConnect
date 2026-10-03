<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventRegistrationResource;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Mosque;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EventRegistrationManagementController extends Controller
{
    public function index(Request $request, Mosque $mosque, Event $event): AnonymousResourceCollection
    {
        Gate::authorize('view', $event);
        abort_unless((int) $event->mosque_id === (int) $mosque->id, 404);

        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'nullable', 'in:registered,attended,cancelled,waitlisted'],
            'occurrence_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $registrations = $event->registrations()
            ->with('user')
            ->when($validated['search'] ?? null, fn ($query, string $search) => $query->whereHas('user', fn ($users) => $users
                ->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")))
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($validated['occurrence_date'] ?? null, fn ($query, string $date) => $query->whereDate('occurrence_date', $date))
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate($request->integer('per_page', 25));

        return EventRegistrationResource::collection($registrations);
    }

    public function toggleCheckIn(Mosque $mosque, Event $event, EventRegistration $registration): JsonResponse
    {
        Gate::authorize('update', $event);
        $this->assertRegistrationBelongs($mosque, $event, $registration);

        if ($registration->status === EventRegistration::STATUS_CANCELLED || $registration->status === EventRegistration::STATUS_WAITLISTED) {
            abort(409, 'Only registered attendees can be checked in.');
        }

        if ($registration->checked_in_at) {
            $registration->checked_in_at = null;
            $registration->status = EventRegistration::STATUS_REGISTERED;
        } else {
            $registration->checked_in_at = now();
            $registration->status = EventRegistration::STATUS_ATTENDED;
        }

        $registration->save();

        return response()->json(['data' => $this->registrationData($registration->fresh('user'))]);
    }

    public function checkInByCode(Request $request, Mosque $mosque, Event $event): JsonResponse
    {
        Gate::authorize('update', $event);
        abort_unless((int) $event->mosque_id === (int) $mosque->id, 404);
        $validated = $request->validate(['code' => ['required', 'string', 'size:8']]);
        $registration = $event->registrations()->where('ticket_code', Str::upper($validated['code']))->firstOrFail();

        return $this->toggleCheckIn($mosque, $event, $registration);
    }

    public function export(Mosque $mosque, Event $event): StreamedResponse
    {
        Gate::authorize('view', $event);
        abort_unless((int) $event->mosque_id === (int) $mosque->id, 404);

        return response()->streamDownload(function () use ($event): void {
            $stream = fopen('php://output', 'wb');
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, ['Name', 'Phone', 'Occurrence date', 'Status', 'Ticket code', 'Checked in at']);

            $event->registrations()->with('user')->orderBy('created_at')->orderBy('id')->chunk(500, function ($registrations) use ($stream): void {
                foreach ($registrations as $registration) {
                    fputcsv($stream, [
                        $registration->user?->name,
                        $registration->user?->phone,
                        $registration->occurrence_date?->format('Y-m-d'),
                        $registration->status,
                        $registration->ticket_code,
                        $registration->checked_in_at?->toDateTimeString(),
                    ]);
                }
            });

            fclose($stream);
        }, "event-{$event->id}-attendees.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function assertRegistrationBelongs(Mosque $mosque, Event $event, EventRegistration $registration): void
    {
        abort_unless((int) $event->mosque_id === (int) $mosque->id, 404);
        abort_unless((int) $registration->event_id === (int) $event->id, 404);
    }

    /** @return array<string, mixed> */
    private function registrationData(EventRegistration $registration): array
    {
        return [
            'id' => $registration->id,
            'user_id' => $registration->user_id,
            'name' => $registration->user?->name,
            'phone' => $registration->user?->phone,
            'occurrence_date' => $registration->occurrence_date?->format('Y-m-d'),
            'status' => $registration->status,
            'ticket_code' => $registration->ticket_code,
            'checked_in_at' => $registration->checked_in_at?->toJSON(),
            'registered_at' => $registration->created_at?->toJSON(),
        ];
    }
}
