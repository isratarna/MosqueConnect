<?php

/*
 * Community-suggested corrections to mosque details and prayer times.
 */
return [
    // Corrections one person may suggest per day.
    'daily_limit' => (int) env('SUGGESTIONS_DAILY_LIMIT', 10),

    // Accepted suggestions needed for the "Trusted contributor" badge.
    'trusted_threshold' => (int) env('SUGGESTIONS_TRUSTED_THRESHOLD', 3),

    // Apply trusted contributors' suggestions straight away, but only for
    // mosques that have no admin team to review them.
    'auto_accept_trusted' => (bool) env('SUGGESTIONS_AUTO_ACCEPT_TRUSTED', true),
];
