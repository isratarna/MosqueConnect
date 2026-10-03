<?php

namespace App\Services\Otp;

/**
 * Sends nothing: PhoneOtpService issues the fixed otp.demo_code instead of a
 * random one, so a demo deployment without an SMS provider can still log in.
 */
class DemoSmsOtpSender implements SmsOtpSender
{
    public function send(string $phone, string $otp): void
    {
        logger()->info('Demo phone OTP issued.', ['phone' => $phone]);
    }
}
