<?php

return [
    'length' => env('OTP_LENGTH', 6),
    'expires_in_minutes' => env('OTP_EXPIRES_IN_MINUTES', 5),

    'sms' => [
        'driver' => env('OTP_SMS_DRIVER', 'log'),
    ],

    'throttle' => [
        'send_per_minute' => env('OTP_SEND_THROTTLE_PER_MINUTE', 5),
        'verify_per_minute' => env('OTP_VERIFY_THROTTLE_PER_MINUTE', 10),
    ],
];
