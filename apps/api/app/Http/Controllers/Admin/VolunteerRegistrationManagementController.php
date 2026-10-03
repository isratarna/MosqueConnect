<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\VolunteerApplicationResource;
use App\Jobs\NotifyVolunteerOpportunityMessage;
use App\Models\Mosque;
use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VolunteerRegistrationManagementController extends Controller
{
    public function index(Request $request, Mosque $mosque, VolunteerOpportunity $volunteerOpportunity): AnonymousResourceCollection
    {
        $this->authorizeOpportunity($mosque, $volunteerOpportunity);
        $validated = $request->validate([
            'status' => ['sometimes', 'nullable', 'in:pending,accepted,rejected,cancelled'],
            'attendance_status' => ['sometimes', 'nullable', 'in:registered,attended,no_show,cancelled'],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
        ]);

        $registrations = $volunteerOpportunity->applications()
            ->with(['user', 'opportunity.mosque', 'opportunity.creator'])
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($validated['attendance_status'] ?? null, fn ($query, string $status) => $query->where('attendance_status', $status))
            ->when($validated['search'] ?? null, fn ($query, string $search) => $query->whereHas('user', fn ($users) => $users
                ->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")))
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate($request->integer('per_page', 25));

        return VolunteerApplicationResource::collection($registrations);
    }

    public function update(Request $request, Mosque $mosque, VolunteerOpportunity $volunteerOpportunity, VolunteerApplication $application): VolunteerApplicationResource
    {
        $this->authorizeOpportunity($mosque, $volunteerOpportunity);
        abort_unless($application->volunteer_opportunity_id === $volunteerOpportunity->id, 404);
        $validated = $request->validate([
            'status' => ['sometimes', 'required', 'in:registered,attended,no_show,cancelled'],
            'attendance_status' => ['sometimes', 'required', 'in:registered,attended,no_show,cancelled'],
            'hours' => ['sometimes', 'nullable', 'numeric', 'between:0,999.9'],
        ]);

        $attendanceStatus = $validated['status'] ?? $validated['attendance_status'] ?? null;
        abort_if($attendanceStatus === null, 422, 'The status field is required.');
        $application->attendance_status = $attendanceStatus;
        if (array_key_exists('hours', $validated)) {
            $application->hours = $validated['hours'];
        }
        if ($application->attendance_status === 'attended') {
            $application->checked_in_at ??= now();
            $application->certificate_code ??= Str::upper(Str::random(20));
        } else {
            $application->checked_in_at = null;
            $application->certificate_code = null;
        }
        $application->save();

        return new VolunteerApplicationResource($application->fresh()->load(['user', 'opportunity.mosque', 'opportunity.creator']));
    }

    public function export(Mosque $mosque, VolunteerOpportunity $volunteerOpportunity): StreamedResponse
    {
        $this->authorizeOpportunity($mosque, $volunteerOpportunity);

        return response()->streamDownload(function () use ($volunteerOpportunity): void {
            $stream = fopen('php://output', 'wb');
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, ['Name', 'Phone', 'Application status', 'Attendance', 'Hours', 'Note', 'Checked in at']);

            $volunteerOpportunity->applications()->with('user')->orderBy('created_at')->orderBy('id')->chunk(500, function ($applications) use ($stream): void {
                foreach ($applications as $application) {
                    fputcsv($stream, [
                        $application->user?->name,
                        $application->user?->phone,
                        $application->status,
                        $application->attendance_status,
                        $application->hours,
                        $application->note,
                        $application->checked_in_at?->toDateTimeString(),
                    ]);
                }
            });

            fclose($stream);
        }, "volunteer-opportunity-{$volunteerOpportunity->id}-registrations.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function message(Request $request, Mosque $mosque, VolunteerOpportunity $volunteerOpportunity): JsonResponse
    {
        $this->authorizeOpportunity($mosque, $volunteerOpportunity);
        $validated = $request->validate(['message' => ['required', 'string', 'max:500']]);
        $count = $volunteerOpportunity->applications()->whereIn('status', VolunteerApplication::ACTIVE_STATUSES)->count();
        $referenceId = (int) now()->format('YmdHisv');
        dispatch(new NotifyVolunteerOpportunityMessage($volunteerOpportunity->id, $validated['message'], $referenceId))->afterCommit();

        return response()->json(['message' => 'Message sent to registered volunteers.', 'recipients_count' => $count]);
    }

    private function authorizeOpportunity(Mosque $mosque, VolunteerOpportunity $opportunity): void
    {
        abort_unless((int) $opportunity->mosque_id === (int) $mosque->id, 404);
        Gate::authorize('update', $opportunity);
    }
}
