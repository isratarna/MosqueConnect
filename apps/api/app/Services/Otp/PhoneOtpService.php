<?php

namespace App\Services\Otp;

use App\Models\PhoneOtpVerification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class PhoneOtpService
{
    public function __construct(
        private readonly SmsOtpSender $sender,
    ) {}

    public function issue(string $phone): PhoneOtpVerification
    {
        $otp = $this->generateOtp();

        PhoneOtpVerification::query()
            ->where('phone', $phone)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $verification = PhoneOtpVerification::create([
            'phone' => $phone,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes((int) config('otp.expires_in_minutes', 5)),
        ]);

        try {
            $this->sender->send($phone, $otp);
        } catch (RuntimeException $exception) {
            $verification->update(['consumed_at' => now()]);

            throw $exception;
        }

        return $verification;
    }

    public function consume(string $phone, string $otp): PhoneOtpVerification
    {
        $verification = PhoneOtpVerification::query()
            ->where('phone', $phone)
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if (! $verification || $verification->isExpired() || ! Hash::check($otp, $verification->otp_hash)) {
            throw ValidationException::withMessages([
                'otp' => ['The OTP is invalid or has expired.'],
            ]);
        }

        $verification->update(['consumed_at' => now()]);

        return $verification;
    }

    private function generateOtp(): string
    {
        $length = (int) config('otp.length', 6);
        $max = (10 ** $length) - 1;

        return str_pad((string) random_int(0, $max), $length, '0', STR_PAD_LEFT);
    }
}
