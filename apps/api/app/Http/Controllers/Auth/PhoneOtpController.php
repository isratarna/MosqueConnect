<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Mosque;
use App\Models\User;
use App\Services\Otp\PhoneOtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PhoneOtpController extends Controller
{
    public function sendOtp(Request $request, PhoneOtpService $otps): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+[1-9]\d{7,14}$/'],
        ]);

        try {
            $otps->issue($validated['phone']);
        } catch (RuntimeException) {
            return response()->json([
                'message' => 'SMS provider is not configured.',
            ], 503);
        }

        return response()->json([
            'message' => 'OTP sent successfully.',
        ]);
    }

    public function verifyOtp(Request $request, PhoneOtpService $otps): JsonResponse
    {
        $otpLength = (int) config('otp.length', 6);

        $validated = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+[1-9]\d{7,14}$/'],
            'otp' => ['required', 'string', 'digits:'.$otpLength],
        ]);

        $user = DB::transaction(function () use ($otps, $validated): User {
            $otps->consume($validated['phone'], $validated['otp']);

            return User::firstOrCreate(
                ['phone' => $validated['phone']],
                [
                    'name' => $validated['phone'],
                    'role' => User::ROLE_NORMAL_USER,
                ],
            );
        });

        if ($user->isSuspended()) {
            return response()->json([
                'message' => 'This account has been suspended.',
            ], 403);
        }

        $token = $user->createToken('phone-otp')->plainTextToken;

        return response()->json([
            'user' => $this->authenticatedUser($user),
            'token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->authenticatedUser($request->user()),
        ]);
    }

    /** @return array<string, mixed> */
    private function authenticatedUser(User $user): array
    {
        $user->load('ownedMosques:id,owner_id,name,address,verification_status');
        $payload = $user->toArray();
        $managedMosque = $user->ownedMosques->first();

        $payload['managed_mosques'] = $payload['owned_mosques'];
        $payload['mosqueName'] = $managedMosque?->name;
        $payload['status'] = $user->isMosqueAdmin()
            ? match ($managedMosque?->verification_status) {
                Mosque::VERIFICATION_VERIFIED => 'approved',
                Mosque::VERIFICATION_REJECTED => 'rejected',
                default => 'pending',
            }
        : null;

        unset($payload['owned_mosques']);

        return $payload;
    }
}
