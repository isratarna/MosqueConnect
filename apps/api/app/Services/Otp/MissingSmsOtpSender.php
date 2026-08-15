<?php

namespace App\Services\Otp;

use RuntimeException;

class MissingSmsOtpSender implements SmsOtpSender
{
    public function send(string $phone, string $otp): void
    {
        throw new RuntimeException('SMS provider is not configured.');
    }
}
