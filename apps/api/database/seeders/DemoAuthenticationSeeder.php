<?php

namespace Database\Seeders;

use App\Models\PhoneOtpVerification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoAuthenticationSeeder extends Seeder
{
    public const OTP = '123456';

    /**
     * Seed a known OTP only in non-production environments. Sending a new OTP
     * intentionally invalidates this code, matching the real authentication flow.
     */
    public function run(): void
    {
        if (app()->environment('production')) {
            return;
        }

        $phones = [
            '+8801700000001', // super admin
            '+8801711000101', // verified mosque admin
            '+8801711000102', // pending mosque admin
            '+8801812000201', // normal user
        ];

        PhoneOtpVerification::query()->whereIn('phone', $phones)->delete();

        foreach ($phones as $phone) {
            PhoneOtpVerification::query()->create([
                'phone' => $phone,
                'otp_hash' => Hash::make(self::OTP),
                'expires_at' => now()->addYear(),
                'consumed_at' => null,
            ]);
        }
    }
}
