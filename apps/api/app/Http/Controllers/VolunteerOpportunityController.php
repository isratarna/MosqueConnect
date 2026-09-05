<?php

namespace App\Http\Controllers;

use App\Http\Resources\VolunteerOpportunityResource;
use App\Models\Mosque;
use App\Models\VolunteerOpportunity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class VolunteerOpportunityController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $opportunities = VolunteerOpportunity::query()
            ->with(['mosque', 'creator'])
            ->available()
            ->orderBy('opportunity_date')
            ->orderBy('start_time')
            ->orderBy('id')
            ->get();

        return VolunteerOpportunityResource::collection($opportunities);
    }

    public function show(VolunteerOpportunity $volunteerOpportunity): VolunteerOpportunityResource
    {
        abort_unless($volunteerOpportunity->status === VolunteerOpportunity::STATUS_ACTIVE, 404);
        abort_unless($volunteerOpportunity->opportunity_date >= today(), 404);

        return new VolunteerOpportunityResource($volunteerOpportunity->load(['mosque', 'creator']));
    }

    public function adminIndex(Mosque $mosque): AnonymousResourceCollection
    {
        Gate::authorize('view', $mosque);

        $opportunities = $mosque->volunteerOpportunities()
            ->with(['mosque', 'creator'])
            ->orderByDesc('opportunity_date')
            ->orderByDesc('id')
            ->get();

        return VolunteerOpportunityResource::collection($opportunities);
    }

    public function adminShow(Mosque $mosque, VolunteerOpportunity $volunteerOpportunity): VolunteerOpportunityResource
    {
        Gate::authorize('view', $volunteerOpportunity);

        return new VolunteerOpportunityResource($volunteerOpportunity->load(['mosque', 'creator', 'registeredUsers']));
    }

    public function store(Mosque $mosque): JsonResponse
    {
        Gate::authorize('create', [VolunteerOpportunity::class, $mosque]);

        $validated = request()->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:10000'],
            'opportunity_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'location' => ['required', 'string', 'max:255'],
            'volunteers_required' => ['required', 'integer', 'min:1'],
            'requirements' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'string', Rule::in(VolunteerOpportunity::INITIAL_STATUSES)],
        ]);

        $opportunity = $mosque->volunteerOpportunities()->create([
            ...$validated,
            'created_by' => request()->user()->id,
            'status' => $validated['status'] ?? VolunteerOpportunity::STATUS_ACTIVE,
        ]);

        return (new VolunteerOpportunityResource($opportunity->load(['mosque', 'creator'])))
            ->additional(['message' => 'Volunteer opportunity created successfully.'])
            ->response()
            ->setStatusCode(201);
    }

    public function update(Mosque $mosque, VolunteerOpportunity $volunteerOpportunity): VolunteerOpportunityResource
    {
        Gate::authorize('update', $volunteerOpportunity);

        $validated = request()->validate([
            'mosque_id' => ['prohibited'],
            'created_by' => ['prohibited'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string', 'max:10000'],
            'opportunity_date' => ['sometimes', 'required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'start_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'end_time' => ['sometimes', 'nullable', 'date_format:H:i', 'after:start_time'],
            'location' => ['sometimes', 'required', 'string', 'max:255'],
            'volunteers_required' => ['sometimes', 'required', 'integer', 'min:1'],
            'requirements' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'required', 'string', Rule::in(VolunteerOpportunity::STATUSES)],
        ]);

        $status = $validated['status'] ?? null;
        unset($validated['status']);

        $volunteerOpportunity->fill($validated);

        if ($status !== null) {
            if (! $volunteerOpportunity->canTransitionTo($status)) {
                abort(422, 'The volunteer opportunity status cannot transition from '.$volunteerOpportunity->status.' to '.$status.'.');
            }
            $volunteerOpportunity->status = $status;
        }

        $volunteerOpportunity->save();

        return (new VolunteerOpportunityResource($volunteerOpportunity->refresh()->load(['mosque', 'creator'])))
            ->additional(['message' => 'Volunteer opportunity updated successfully.']);
    }

    public function updateStatus(Mosque $mosque, VolunteerOpportunity $volunteerOpportunity): VolunteerOpportunityResource
    {
        Gate::authorize('update', $volunteerOpportunity);

        $validated = request()->validate([
            'status' => ['required', 'string', Rule::in(VolunteerOpportunity::STATUSES)],
        ]);

        $status = $validated['status'];
        if (! $volunteerOpportunity->canTransitionTo($status)) {
            abort(422, 'The volunteer opportunity status cannot transition from '.$volunteerOpportunity->status.' to '.$status.'.');
        }

        $volunteerOpportunity->status = $status;
        $volunteerOpportunity->save();

        return (new VolunteerOpportunityResource($volunteerOpportunity->refresh()->load(['mosque', 'creator'])))
            ->additional(['message' => 'Volunteer opportunity status updated successfully.']);
    }

    public function destroy(Mosque $mosque, VolunteerOpportunity $volunteerOpportunity): JsonResponse
    {
        Gate::authorize('delete', $volunteerOpportunity);
        $volunteerOpportunity->delete();

        return response()->json(['message' => 'Volunteer opportunity deleted successfully.']);
    }
}
