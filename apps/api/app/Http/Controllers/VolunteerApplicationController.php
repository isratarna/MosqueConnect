<?php

namespace App\Http\Controllers;

use App\Http\Resources\VolunteerApplicationResource;
use App\Models\Mosque;
use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class VolunteerApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()
            ->volunteerApplications()
            ->with($this->opportunityEagerLoads())
            ->latest();

        if ($request->filled('status')) {
            $query->where('volunteer_applications.status', $request->query('status'));
        }

        $applications = $query->get();

        return response()->json([
            'data' => $applications->map(fn (VolunteerApplication $application) => new VolunteerApplicationResource($application)),
        ]);
    }

    public function show(Request $request, VolunteerApplication $application): JsonResponse
    {
        if ($request->user()->id !== $application->user_id) {
            abort(404);
        }

        return response()->json([
            'data' => new VolunteerApplicationResource($application->load($this->opportunityEagerLoads())),
        ]);
    }

    public function store(Request $request, VolunteerOpportunity $volunteerOpportunity): JsonResponse
    {
        $userId = $request->user()->id;

        $application = DB::transaction(function () use ($volunteerOpportunity, $userId) {
            /** @var VolunteerOpportunity $lockedOpportunity */
            $lockedOpportunity = VolunteerOpportunity::query()->lockForUpdate()->findOrFail($volunteerOpportunity->id);

            abort_if($lockedOpportunity->opportunity_date < today(), 409, 'This opportunity has already passed.');
            abort_unless($lockedOpportunity->status === VolunteerOpportunity::STATUS_ACTIVE, 409, 'This opportunity is no longer accepting volunteers.');

            $existing = $lockedOpportunity->applications()->where('user_id', $userId)->first();

            if ($existing) {
                if (in_array($existing->status, [VolunteerApplication::STATUS_PENDING, VolunteerApplication::STATUS_ACCEPTED], true)) {
                    abort(409, 'already applied');
                }

                if ($existing->status === VolunteerApplication::STATUS_CANCELLED) {
                    $existing->status = VolunteerApplication::STATUS_PENDING;
                    $existing->reviewed_by = null;
                    $existing->reviewed_at = null;
                    $existing->cancelled_at = null;
                    $existing->save();

                    return $existing;
                }

                if ($existing->status === VolunteerApplication::STATUS_REJECTED) {
                    abort(409, 'Your previous application for this opportunity was declined.');
                }

                abort(409, 'already applied');
            }

            $acceptedCount = $lockedOpportunity->applications()->where('status', VolunteerApplication::STATUS_ACCEPTED)->count();
            if ($lockedOpportunity->volunteers_required <= $acceptedCount) {
                abort(409, 'This opportunity is full.');
            }

            return $lockedOpportunity->applications()->create([
                'user_id' => $userId,
                'status' => VolunteerApplication::STATUS_PENDING,
            ]);
        });

        return response()->json([
            'message' => 'Volunteer application submitted successfully.',
            'data' => new VolunteerApplicationResource($application->load($this->opportunityEagerLoads())),
        ], 201);
    }

    public function cancel(Request $request, VolunteerApplication $application): JsonResponse
    {
        if (! $request->user()->is($application->user)) {
            abort(404);
        }

        if (! $application->canTransitionTo(VolunteerApplication::STATUS_CANCELLED)) {
            abort(422, 'This application cannot be cancelled in its current state.');
        }

        $application->status = VolunteerApplication::STATUS_CANCELLED;
        $application->cancelled_at = $application->cancelled_at ?? now();
        $application->save();

        return response()->json([
            'message' => 'Volunteer application cancelled successfully.',
            'data' => new VolunteerApplicationResource($application->fresh()->load($this->opportunityEagerLoads())),
        ]);
    }

    public function listForMosque(Mosque $mosque, Request $request): AnonymousResourceCollection
    {
        Gate::authorize('view', $mosque);

        $query = $mosque->volunteerApplications()
            ->with(['user', 'reviewer', ...$this->opportunityEagerLoads()])
            ->latest();

        if ($request->filled('status')) {
            $query->where('volunteer_applications.status', $request->query('status'));
        }

        return VolunteerApplicationResource::collection($query->paginate(25));
    }

    public function listForOpportunity(Mosque $mosque, VolunteerOpportunity $volunteerOpportunity, Request $request): JsonResponse
    {
        Gate::authorize('view', $volunteerOpportunity);

        $applications = $volunteerOpportunity->applications()
            ->with(['user', ...$this->opportunityEagerLoads()])
            ->when($request->filled('status'), fn ($query) => $query->where('volunteer_applications.status', $request->query('status')))
            ->latest()
            ->get();

        return response()->json([
            'data' => $applications->map(fn (VolunteerApplication $application) => new VolunteerApplicationResource($application)),
        ]);
    }

    public function accept(Mosque $mosque, VolunteerOpportunity $volunteerOpportunity, VolunteerApplication $application): JsonResponse
    {
        Gate::authorize('update', $volunteerOpportunity);

        if (! $application->opportunity->is($volunteerOpportunity)) {
            abort(404);
        }

        if ($application->status === VolunteerApplication::STATUS_ACCEPTED) {
            abort(422, 'This application has already been accepted.');
        }

        if (! $application->canTransitionTo(VolunteerApplication::STATUS_ACCEPTED)) {
            abort(422, 'This application cannot be accepted in its current state.');
        }

        $result = DB::transaction(function () use ($volunteerOpportunity, $application) {
            $lockedOpportunity = VolunteerOpportunity::query()->lockForUpdate()->findOrFail($volunteerOpportunity->id);
            $application->refresh();
            if ($application->status === VolunteerApplication::STATUS_ACCEPTED) {
                abort(422, 'This application has already been accepted.');
            }

            if ($lockedOpportunity->status !== VolunteerOpportunity::STATUS_ACTIVE) {
                abort(409, 'This opportunity is no longer accepting volunteers.');
            }

            if (! $application->canTransitionTo(VolunteerApplication::STATUS_ACCEPTED)) {
                abort(422, 'This application cannot be accepted in its current state.');
            }

            $acceptedCount = $lockedOpportunity->applications()->where('status', VolunteerApplication::STATUS_ACCEPTED)->count();
            if ($lockedOpportunity->volunteers_required <= $acceptedCount) {
                abort(409, 'This opportunity is full.');
            }

            $application->status = VolunteerApplication::STATUS_ACCEPTED;
            $application->reviewed_by = auth()->id();
            $application->reviewed_at = now();
            $application->cancelled_at = null;
            $application->save();

            return $application;
        });

        return response()->json([
            'message' => 'Volunteer application accepted.',
            'data' => new VolunteerApplicationResource($result->fresh()->load(['user', 'reviewer', ...$this->opportunityEagerLoads()])),
        ]);
    }

    public function reject(Mosque $mosque, VolunteerOpportunity $volunteerOpportunity, VolunteerApplication $application): JsonResponse
    {
        Gate::authorize('update', $volunteerOpportunity);

        if (! $application->opportunity->is($volunteerOpportunity)) {
            abort(404);
        }

        if ($application->status === VolunteerApplication::STATUS_REJECTED) {
            abort(422, 'This application has already been rejected.');
        }

        if (! $application->canTransitionTo(VolunteerApplication::STATUS_REJECTED)) {
            abort(422, 'This application cannot be rejected in its current state.');
        }

        $application->status = VolunteerApplication::STATUS_REJECTED;
        $application->reviewed_by = auth()->id();
        $application->reviewed_at = now();
        $application->save();

        return response()->json([
            'message' => 'Volunteer application rejected.',
            'data' => new VolunteerApplicationResource($application->fresh()->load(['user', 'reviewer', ...$this->opportunityEagerLoads()])),
        ]);
    }

    /** @return array<string, \Closure> */
    private function opportunityEagerLoads(): array
    {
        return [
            'opportunity' => fn ($query) => $query
                ->with(['mosque', 'creator'])
                ->withCount([
                    'applications as registrations_count' => fn ($applications) => $applications->whereIn('status', [VolunteerApplication::STATUS_PENDING, VolunteerApplication::STATUS_ACCEPTED]),
                    'applications as accepted_count' => fn ($applications) => $applications->where('status', VolunteerApplication::STATUS_ACCEPTED),
                ]),
        ];
    }
}
