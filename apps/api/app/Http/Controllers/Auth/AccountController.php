<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use App\Services\Otp\PhoneOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AccountController extends Controller
{
    public function destroy(Request $request, PhoneOtpService $otps): JsonResponse
    {
        $validated = $request->validate([
            'otp' => ['required', 'string', 'digits:'.(int) config('otp.length', 6)],
        ]);

        $documentPaths = DB::transaction(function () use ($request, $otps, $validated): array {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);

            if ($user->isSuperAdmin() || $user->ownedMosques()->exists()) {
                throw ValidationException::withMessages([
                    'account' => ['Transfer mosque ownership or super-admin access before deleting this account.'],
                ]);
            }

            $otps->consume($user->phone, $validated['otp']);
            $documentPaths = $user->verificationRequests()->pluck('document_path')->all();
            $user->verificationRequests()->delete();

            DB::table('campaign_donations')->where('user_id', $user->id)->update([
                'user_id' => null,
                'donor_name' => null,
                'contact' => null,
                'updated_at' => now(),
            ]);
            DB::table('blood_requests')->where('created_by', $user->id)->update([
                'created_by' => null,
                'contact_name' => null,
                'contact_phone' => null,
                'updated_at' => now(),
            ]);
            DB::table('blood_request_responses')->where('user_id', $user->id)->update([
                'user_id' => null,
                'message' => null,
                'updated_at' => now(),
            ]);

            $user->followers()->delete();
            $user->notifications()->delete();
            $user->notificationPreferences()->delete();
            $user->tokens()->delete();

            AdminAuditLog::record($user, 'account.deleted', $user);
            $user->forceFill([
                'name' => 'Deleted user',
                'phone' => 'deleted-'.hash('sha256', $user->id.':'.random_bytes(32)),
                'email' => null,
                'email_verified_at' => null,
            ])->save();

            return $documentPaths;
        });

        Storage::disk('local')->delete($documentPaths);

        return response()->json(['message' => 'Account deleted successfully.']);
    }

    public function export(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = [
            'exported_at' => now()->toIso8601String(),
            'profile' => $user->only(['id', 'name', 'phone', 'email', 'terms_accepted_at', 'created_at']),
            'follows' => $user->followers()->with('mosque:id,name')->get(),
            'event_registrations' => $user->eventRegistrations()->get(),
            'volunteer_registrations' => $user->volunteerApplications()->get(),
            'donations' => $user->campaignDonations()->get(),
            'blood_requests' => $user->bloodRequests()->get(),
            'blood_responses' => $user->bloodRequestResponses()->get(),
            'claims' => $user->verificationRequests()->get(),
            'notifications' => $user->notifications()->where('created_at', '>=', now()->subMonths(6))->get(),
        ];

        return response()->json($data)
            ->header('Content-Disposition', 'attachment; filename="mosqueconnect-data.json"')
            ->header('Cache-Control', 'private, no-store');
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'All sessions signed out.']);
    }

    public function sendPhoneChangeOtp(Request $request, PhoneOtpService $otps): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+[1-9]\d{7,14}$/', Rule::unique('users', 'phone')],
        ]);

        try {
            $otps->issue($validated['phone']);
        } catch (RuntimeException) {
            return response()->json(['message' => 'SMS provider is not configured.'], 503);
        }

        return response()->json(['message' => 'OTP sent to the new phone number.']);
    }

    public function verifyPhoneChange(Request $request, PhoneOtpService $otps): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+[1-9]\d{7,14}$/', Rule::unique('users', 'phone')],
            'otp' => ['required', 'string', 'digits:'.(int) config('otp.length', 6)],
        ]);
        $user = $request->user();

        DB::transaction(function () use ($request, $otps, $validated, $user): void {
            $locked = User::query()->lockForUpdate()->findOrFail($user->id);
            if (User::query()->where('phone', $validated['phone'])->exists()) {
                throw ValidationException::withMessages(['phone' => ['This phone number is already in use.']]);
            }

            $otps->consume($validated['phone'], $validated['otp']);
            $locked->phone = $validated['phone'];
            $locked->save();

            $currentTokenId = $request->user()->currentAccessToken()?->getKey();
            $locked->tokens()->when(
                $currentTokenId,
                fn ($query) => $query->where('id', '!=', $currentTokenId),
            )->delete();
        });

        return response()->json(['message' => 'Phone number updated.']);
    }
}