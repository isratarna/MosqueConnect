<?php

namespace App\Jobs;

use App\Models\Mosque;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyMosqueFollowers implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [10, 60];

    /**
     * @param  array{type: string, id: int}|null  $reference
     */
    public function __construct(
        public int $mosqueId,
        public string $type,
        public string $title,
        public string $body,
        public ?array $reference = null,
    ) {}

    public function handle(NotificationService $notifications): void
    {
        $mosque = Mosque::query()->findOrFail($this->mosqueId);

        $notifications->notifyMosqueFollowers($mosque, [
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->body,
            'reference_type' => $this->reference['type'] ?? null,
            'reference_id' => $this->reference['id'] ?? null,
        ]);
    }
}
