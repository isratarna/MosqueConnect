<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Mosque;
use App\Models\User;
use App\Services\MosqueTeamService;
use App\Services\Otp\PhoneOtpService;
use App\Support\MosqueAbility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Illuminate\Validation\Rule;

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

    public function verifyOtp(Request $request, PhoneOtpService $otps, MosqueTeamService $team): JsonResponse
    {
        $otpLength = (int) config('otp.length', 6);
        $isNewUser = ! User::query()->where('phone', $request->input('phone'))->exists();

        $validated = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+[1-9]\d{7,14}$/'],
            'otp' => ['required', 'string', 'digits:'.$otpLength],
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'accept_terms' => [Rule::requiredIf($isNewUser), 'accepted'],
        ]);

        $user = DB::transaction(function () use ($otps, $validated, $isNewUser): User {
            $otps->consume($validated['phone'], $validated['otp']);

            $user = User::firstOrCreate(
                ['phone' => $validated['phone']],
                [
                    'name' => $validated['name'] ?? $validated['phone'],
                    'role' => User::ROLE_NORMAL_USER,
                ],
            );

            if ($user->wasRecentlyCreated && $isNewUser) {
                $user->forceFill(['terms_accepted_at' => now()])->save();
            }

            return $user;
        });

        if ($user->isSuspended()) {
            return response()->json([
                'message' => 'This account has been suspended.',
            ], 403);
        }

        // Team invitations sent to this number before the account existed.
        $team->attachPendingInvites($user);

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

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users')->ignore($request->user()->id)],
            'phone' => ['prohibited'],
            'role' => ['prohibited'],
            'account_status' => ['prohibited'],
        ]);

        $user = $request->user();
        $user->name = $validated['name'];
        if (array_key_exists('email', $validated)) {
            if ($user->email !== $validated['email']) {
                $user->email_verified_at = null;
            }
            $user->email = $validated['email'];
        }
        $user->save();

        return response()->json(['message' => 'Profile saved.', 'user' => $this->authenticatedUser($user)]);
    }

    /** @return array<string, mixed> */
    private function authenticatedUser(User $user): array
    {
        $user->load(['managedMosques' => fn ($query) => $query
            ->select(['mosques.id', 'mosques.owner_id', 'mosques.name', 'mosques.address', 'mosques.verification_status'])
            ->orderBy('mosque_members.id')]);
        $payload = $user->toArray();
        $managedMosque = $user->managedMosques->first();

        // Every mosque the user is on the team of, with their role there.
        $payload['managed_mosques'] = $user->managedMosques
            ->map(fn (Mosque $mosque): array => [
                'id' => $mosque->id,
                'owner_id' => $mosque->owner_id,
                'name' => $mosque->name,
                'address' => $mosque->address,
                'verification_status' => $mosque->verification_status,
                'role' => $mosque->pivot->role,
                'abilities' => MosqueAbility::forRole($mosque->pivot->role),
            ])
            ->values()
            ->all();
        $payload['pending_mosque_invites_count'] = $user->mosqueMemberships()->pending()->count();
        $payload['trusted_contributor'] = $user->isTrustedContributor();
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
