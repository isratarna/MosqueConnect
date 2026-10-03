<?php

/*
 * Community blood donation requests.
 */
return [
    // Blood requests one person may post per day, to stop spam emergencies.
    'daily_request_limit' => (int) env('BLOOD_REQUESTS_DAILY_LIMIT', 5),
];