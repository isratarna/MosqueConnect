<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Travel speeds and buffers
    |--------------------------------------------------------------------------
    |
    | Straight-line distance is multiplied by the road factor to approximate
    | the real path, then divided by the mode's speed (km/h). The drive speed
    | is a city speed: it is used for short hops to a nearby mosque.
    |
    */

    'road_factor' => 1.3,

    'speeds_kmh' => [
        'walk' => 4.5,
        'drive' => 20,
    ],

    // You must be at the mosque this many minutes before the jamaat starts.
    'buffer_min' => 2,

    // Time to park and walk in from the car when stopping on a journey.
    'parking_min' => 3,

    /*
    |--------------------------------------------------------------------------
    | "Catch the next jamaat" (Home card)
    |--------------------------------------------------------------------------
    */

    'catchable' => [
        'radius_km' => ['walk' => 3, 'drive' => 10],
        'max_candidates' => 40,
        'limit' => 3,
    ],

    /*
    |--------------------------------------------------------------------------
    | Journey planner
    |--------------------------------------------------------------------------
    */

    'plan' => [
        // Modes offered to the traveller and the Geoapify routing mode for each.
        // Geoapify also has "motorcycle" if a two-wheeler option is added later.
        'modes' => ['drive' => 'drive', 'walk' => 'walk'],
        'walk_max_km' => 15,
        'corridor_km' => ['default' => 2, 'min' => 0.5, 'max' => 5],
        'prayer_duration_min' => ['default' => 15, 'min' => 10, 'max' => 30],
        'resample_m' => 500,
        'window_km' => 10,
        'rejoin_m' => 1000,
        // Stops with a longer wait than this are not offered.
        'max_wait_min' => 60,
        'options_per_prayer' => 3,
        // Only this many candidates per prayer are refined with real driving times.
        'refine_top' => 3,
        // Geoapify allows up to 1000 cells (sources × targets) per matrix call.
        'matrix_max_elements' => 1000,
        // Geoapify "approximated" traffic only for departures this soon; later
        // traffic cannot be known, so free-flow times are used instead.
        'traffic_aware_hours' => 3,
        'max_waypoints' => 4,
        'cache_minutes' => 15,
        'throttle' => ['guest_per_hour' => 5, 'user_per_day' => 20],
    ],

];
