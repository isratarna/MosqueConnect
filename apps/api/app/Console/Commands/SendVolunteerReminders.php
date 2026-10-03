<?php

namespace App\Console\Commands;

use App\Models\VolunteerApplication;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendVolunteerReminders extends Command
{
    protected $signature = 'volunteers:send-reminders';

    protected $description = 'Notify accepted volunteers about tomorrow’s opportunities';

    public function handle(NotificationService $notifications): int
    {
        $tomorrow = today()->addDay()->toDateString();
        $sent = 0;

        VolunteerApplication::query()
            ->where('status', VolunteerApplication::STATUS_ACCEPTED)
            ->where('attendance_status', 'registered')
            ->whereHas('opportunity', fn ($query) => $query
                ->where('status', 'active')
                ->whereDate('opportunity_date', $tomorrow))
            ->with(['user', 'opportunity.mosque'])
            ->orderBy('id')
            ->chunkById(500, function ($applications) use ($notifications, &$sent): void {
                foreach ($applications as $application) {
                    $sent += (int) $notifications->notifyVolunteer(
                        $application->user_id,
                        $application->opportunity->mosque,
                        $application->id,
                        'Volunteer reminder for tomorrow',
                        "Reminder: {$application->opportunity->title} is scheduled for tomorrow.",
                        'volunteer_reminder',
                    );
                }
            });

        $this->info("Sent {$sent} volunteer reminders.");

        return self::SUCCESS;
    }
}
