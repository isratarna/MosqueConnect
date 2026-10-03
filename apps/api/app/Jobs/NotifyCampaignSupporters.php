<?php

namespace App\Jobs;

use App\Models\CampaignUpdate;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyCampaignSupporters implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [10, 60];

    public function __construct(public int $campaignUpdateId) {}

    public function handle(NotificationService $notifications): void
    {
        $update = CampaignUpdate::query()->findOrFail($this->campaignUpdateId);
        $notifications->notifyCampaignSupporters($update);
    }
}