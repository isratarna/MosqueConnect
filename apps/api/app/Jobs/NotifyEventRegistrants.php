<?php

namespace App\Jobs;

use App\Models\Event;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyEventRegistrants implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $eventId,
        public string $referenceType,
        public string $title,
        public string $message,
        public ?int $referenceId = null,
    ) {}

    public function handle(NotificationService $notifications): void
    {
        $event = Event::query()->find($this->eventId);
        if (! $event) {
            return;
        }

        $notifications->notifyEventRegistrants(
            $event,
            $this->referenceType,
            $this->title,
            $this->message,
            $this->referenceId,
        );
    }
}
