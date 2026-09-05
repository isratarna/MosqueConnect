<?php

namespace App\Http\Controllers;

use App\Models\VolunteerOpportunity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VolunteerRegistrationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => DB::table('volunteer_registrations')
            ->where('user_id', $request->user()->id)->get()]);
    }

    public function store(Request $request, VolunteerOpportunity $volunteerOpportunity): JsonResponse
    {
        return DB::transaction(function () use ($request, $volunteerOpportunity) {
            $opportunity = VolunteerOpportunity::query()->lockForUpdate()->findOrFail($volunteerOpportunity->id);
            abort_unless($opportunity->status === VolunteerOpportunity::STATUS_ACTIVE && $opportunity->opportunity_date >= today(), 409, 'This opportunity is no longer accepting volunteers.');
            $registrations = DB::table('volunteer_registrations')->where('volunteer_opportunity_id', $opportunity->id);
            abort_if((clone $registrations)->where('user_id', $request->user()->id)->exists(), 409, 'You have already signed up.');
            abort_if($registrations->count() >= $opportunity->volunteers_required, 409, 'This opportunity is full.');
            DB::table('volunteer_registrations')->insert([
                'volunteer_opportunity_id' => $opportunity->id,
                'user_id' => $request->user()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            return response()->json(['message' => 'Your volunteer signup has been saved.'], 201);
        });
    }

    public function destroy(Request $request, VolunteerOpportunity $volunteerOpportunity): JsonResponse
    {
        DB::transaction(function () use ($request, $volunteerOpportunity) {
            VolunteerOpportunity::query()->lockForUpdate()->findOrFail($volunteerOpportunity->id);
            DB::table('volunteer_registrations')->where('volunteer_opportunity_id', $volunteerOpportunity->id)
                ->where('user_id', $request->user()->id)->delete();
        });
        return response()->json(['message' => 'Your signup was cancelled.']);
    }
}
