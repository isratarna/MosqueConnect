<?php

namespace App\Services\Otp;

interface SmsOtpSender
{
    public function send(string $phone, string $otp): void;
}
