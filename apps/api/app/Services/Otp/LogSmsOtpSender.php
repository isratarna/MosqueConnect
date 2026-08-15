<?php

namespace App\Services\Otp;

use RuntimeException;

class LogSmsOtpSender implements SmsOtpSender
{
    public function send(string $phone, string $otp): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('SMS provider is not configured.');
        }

        logger()->info('Local phone OTP generated.', [
            'phone' => $phone,
            'otp' => $otp,
        ]);
    }
}
