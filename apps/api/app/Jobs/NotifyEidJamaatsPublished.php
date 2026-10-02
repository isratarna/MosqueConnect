<?php

namespace App\Jobs;

use App\Models\Mosque;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Tells a mosque's followers that its Eid jamaat times are published.
 */
class NotifyEidJamaatsPublished implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Mosque $mosque,
        public string $eid,
        public int $year,
    ) {}

    public function handle(NotificationService $notifications): void
    {
        $jamaats = $this->mosque->eidJamaats()
            ->published()
            ->forSeason($this->eid, $this->year)
            ->get();

        $notifications->notifyEidJamaatsPublished($this->mosque, $this->eid, $this->year, $jamaats);
    }
}
