<?php

namespace App\Support;

class ClockTime
{
    public static function format(?string $time): ?string
    {
        return $time === null ? null : substr($time, 0, 5);
    }
}
