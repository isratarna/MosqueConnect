<?php

namespace App\Http\Controllers;

use App\Http\Resources\VolunteerApplicationResource;
use App\Models\Mosque;
use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class VolunteerApplicationController extends Controller
{
    public function apply(VolunteerOpportunity $volunteerOpportunity): JsonResponse
    {
        abort_unless($volunteerOpportunity->status === VolunteerOpportunity::STATUS_ACTIVE, 404);
        abort_unless($volunteerOpportunity->opportunity_date >= today(), 404);

        $user = request()->user();

        $existing = VolunteerApplication::query()
            ->where('user_id', $user->id)
            ->where('volunteer_opportunity_id', $volunteerOpportunity->id)
            ->whereIn('status', [VolunteerApplication::STATUS_PENDING, VolunteerApplication::STATUS_ACCEPTED])
            ->exists();

        if ($existing) {
            abort(422, 'You have already applied for this volunteer opportunity.');
        }

        $validated = request()->validate([
            'message' => ['nullable', 'string', 'max:5000'],
        ]);

        $application = $volunteerOpportunity->applications()->create([
            'user_id' => $user->id,
            'message' => $validated['message'] ?? null,
            'status' => VolunteerApplication::STATUS_PENDING,
        ]);

        return (new VolunteerApplicationResource($application->load(['user', 'opportunity.mosque'])))
            ->additional(['message' => 'Volunteer application submitted successfully.'])
            ->response()
            ->setStatusCode(201);
    }

    public function index(): AnonymousResourceCollection
    {
        $applications = request()->user()->volunteerApplications()
            ->with(['user', 'opportunity.mosque'])
            ->latest()
            ->get();

        return VolunteerApplicationResource::collection($applications);
    }

    public function show(VolunteerApplication $volunteerApplication): VolunteerApplicationResource
    {
        Gate::authorize('view', $volunteerApplication);

        return new VolunteerApplicationResource($volunteerApplication->load(['user', 'opportunity.mosque']));
    }

    public function adminIndex(Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('view', $mosque);

        $applications = $mosque->volunteerApplications()
            ->with(['user', 'opportunity.mosque'])
            ->latest()
            ->get();

        return VolunteerApplicationResource::collection($applications);
    }

    public function adminShow(Mosque $mosque, VolunteerApplication $volunteerApplication): VolunteerApplicationResource
    {
        Gate::authorize('view', $volunteerApplication);

        return new VolunteerApplicationResource($volunteerApplication->load(['user', 'opportunity.mosque']));
    }

    public function accept(Mosque $mosque, VolunteerApplication $volunteerApplication): VolunteerApplicationResource
    {
        Gate::authorize('update', $volunteerApplication);

        if ($volunteerApplication->status !== VolunteerApplication::STATUS_PENDING) {
            abort(422, 'Only a pending volunteer application can be accepted.');
        }

        $volunteerApplication->status = VolunteerApplication::STATUS_ACCEPTED;
        $volunteerApplication->reviewed_by = request()->user()->id;
        $volunteerApplication->reviewed_at = now();
        $volunteerApplication->save();

        return (new VolunteerApplicationResource($volunteerApplication->refresh()->load(['user', 'opportunity.mosque'])))
            ->additional(['message' => 'Volunteer application accepted successfully.']);
    }

    public function reject(Mosque $mosque, VolunteerApplication $volunteerApplication): VolunteerApplicationResource
    {
        Gate::authorize('update', $volunteerApplication);

        $validated = request()->validate([
            'review_note' => ['nullable', 'string', 'max:5000'],
        ]);

        if ($volunteerApplication->status !== VolunteerApplication::STATUS_PENDING) {
            abort(422, 'Only a pending volunteer application can be rejected.');
        }

        $volunteerApplication->status = VolunteerApplication::STATUS_REJECTED;
        $volunteerApplication->reviewed_by = request()->user()->id;
        $volunteerApplication->reviewed_at = now();
        $volunteerApplication->review_note = $validated['review_note'] ?? null;
        $volunteerApplication->save();

        return (new VolunteerApplicationResource($volunteerApplication->refresh()->load(['user', 'opportunity.mosque'])))
            ->additional(['message' => 'Volunteer application rejected successfully.']);
    }
}
