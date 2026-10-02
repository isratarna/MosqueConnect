<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Calculated prayer times
    |--------------------------------------------------------------------------
    |
    | Used when a mosque has not published its own times. The defaults follow
    | the usual Bangladesh conventions: the University of Islamic Sciences,
    | Karachi method (Fajr and Isha at 18 degrees) with Hanafi Asr. Any
    | IslamicNetwork\PrayerTimes\Method constant may be used as the method,
    | and the school is either STANDARD or HANAFI.
    |
    */

    'method' => env('PRAYER_CALCULATION_METHOD', 'KARACHI'),

    'asr_school' => env('PRAYER_ASR_SCHOOL', 'HANAFI'),

    'timezone' => env('PRAYER_TIMEZONE', 'Asia/Dhaka'),

    /*
    |--------------------------------------------------------------------------
    | Precautionary minutes
    |--------------------------------------------------------------------------
    |
    | Minutes added to each astronomically calculated adhan time. The Islamic
    | Foundation Bangladesh timetable adds a few minutes of precaution
    | (ihtiyat), most noticeably to Maghrib, which it starts three minutes
    | after sunset.
    |
    */

    'adjustments' => [
        'fajr' => 0,
        'dhuhr' => 1,
        'asr' => 0,
        'maghrib' => 3,
        'isha' => 0,
    ],

    /*
    |--------------------------------------------------------------------------
    | Estimated jamaat offsets
    |--------------------------------------------------------------------------
    |
    | Minutes between the calculated adhan and the estimated jamaat.
    |
    */

    'jamaat_offsets' => [
        'fajr' => 20,
        'dhuhr' => 30,
        'asr' => 15,
        'maghrib' => 5,
        'isha' => 15,
    ],

];
