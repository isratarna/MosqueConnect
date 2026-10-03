<?php

namespace App\Jobs;

use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyVolunteerOpportunityMessage implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $opportunityId,
        public string $message,
        public int $referenceId,
    ) {}

    public function handle(NotificationService $notifications): void
    {
        $opportunity = VolunteerOpportunity::query()->with('mosque')->find($this->opportunityId);
        if (! $opportunity) {
            return;
        }

        $opportunity->applications()
            ->whereIn('status', VolunteerApplication::ACTIVE_STATUSES)
            ->orderBy('id')
            ->chunkById(500, function ($applications) use ($notifications, $opportunity): void {
                foreach ($applications as $application) {
                    $notifications->notifyVolunteer(
                        $application->user_id,
                        $opportunity->mosque,
                        $this->referenceId,
                        "Message about {$opportunity->title}",
                        $this->message,
                        'volunteer_message',
                    );
                }
            });
    }
}
