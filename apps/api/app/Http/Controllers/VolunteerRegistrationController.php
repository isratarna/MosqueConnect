<?php

namespace App\Http\Controllers;

use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class VolunteerRegistrationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $applications = $request->user()
            ->volunteerApplications()
            ->latest()
            ->get(['id', 'volunteer_opportunity_id', 'status', 'attendance_status', 'hours', 'note', 'checked_in_at', 'created_at']);

        return response()->json([
            'data' => $applications->map(fn (VolunteerApplication $application) => [
                'id' => $application->id,
                'volunteer_opportunity_id' => $application->volunteer_opportunity_id,
                'status' => $application->status,
                'attendance_status' => $application->attendance_status,
                'hours' => $application->hours,
                'note' => $application->note,
                'checked_in_at' => $application->checked_in_at?->toJSON(),
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

    public function summary(Request $request): JsonResponse
    {
        $rows = DB::table('volunteer_applications')
            ->join('volunteer_opportunities', 'volunteer_opportunities.id', '=', 'volunteer_applications.volunteer_opportunity_id')
            ->join('mosques', 'mosques.id', '=', 'volunteer_opportunities.mosque_id')
            ->where('volunteer_applications.user_id', $request->user()->id)
            ->where('volunteer_applications.attendance_status', 'attended')
            ->select('mosques.id as mosque_id', 'mosques.name as mosque_name')
            ->selectRaw('COUNT(volunteer_applications.id) as opportunities_attended')
            ->selectRaw('COALESCE(SUM(volunteer_applications.hours), 0) as total_hours')
            ->groupBy('mosques.id', 'mosques.name')
            ->orderBy('mosques.name')
            ->get();

        return response()->json([
            'total_opportunities_attended' => (int) $rows->sum('opportunities_attended'),
            'total_hours' => (float) $rows->sum('total_hours'),
            'mosques' => $rows->map(fn ($row): array => [
                'mosque_id' => (int) $row->mosque_id,
                'mosque_name' => $row->mosque_name,
                'opportunities_attended' => (int) $row->opportunities_attended,
                'total_hours' => (float) $row->total_hours,
            ]),
        ]);
    }

    public function certificate(Request $request, VolunteerApplication $application): Response
    {
        abort_unless((int) $application->user_id === (int) $request->user()->id, 404);
        abort_unless($application->attendance_status === 'attended' && filled($application->certificate_code), 404);

        $application->load(['user', 'opportunity.mosque']);
        $pdf = Pdf::loadView('certificates.volunteer', ['application' => $application])->setPaper('a4', 'landscape');

        return $pdf->download('volunteer-certificate-'.$application->certificate_code.'.pdf');
    }

    public function verifyCertificate(string $code): JsonResponse
    {
        $application = VolunteerApplication::query()
            ->where('certificate_code', $code)
            ->where('attendance_status', 'attended')
            ->with(['user:id,name', 'opportunity:id,title,opportunity_date,mosque_id', 'opportunity.mosque:id,name'])
            ->first();

        abort_unless($application, 404);

        return response()->json([
            'valid' => true,
            'volunteer' => $application->user->name,
            'opportunity' => $application->opportunity->title,
            'mosque' => $application->opportunity->mosque->name,
            'date' => $application->opportunity->opportunity_date->format('Y-m-d'),
            'hours' => (float) $application->hours,
        ]);
    }
}
