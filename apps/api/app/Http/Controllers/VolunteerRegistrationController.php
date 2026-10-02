<?php

namespace App\Http\Controllers;

use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VolunteerRegistrationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $applications = $request->user()
            ->volunteerApplications()
            ->latest()
            ->get(['id', 'volunteer_opportunity_id', 'status', 'created_at']);

        return response()->json([
            'data' => $applications->map(fn (VolunteerApplication $application) => [
                'id' => $application->id,
                'volunteer_opportunity_id' => $application->volunteer_opportunity_id,
                'status' => $application->status,
                'created_at' => $application->created_at?->toJSON(),
            ]),
        ]);
    }

    public function store(Request $request, VolunteerOpportunity $volunteerOpportunity): JsonResponse
    {
        return app(VolunteerApplicationController::class)->store($request, $volunteerOpportunity);
    }

    public function destroy(Request $request, VolunteerOpportunity $volunteerOpportunity): JsonResponse
    {
        $application = $volunteerOpportunity->applications()->where('user_id', $request->user()->id)->first();

        abort_if(! $application, 404, 'You have not applied for this opportunity.');

        return app(VolunteerApplicationController::class)->cancel($request, $application);
    }
}
