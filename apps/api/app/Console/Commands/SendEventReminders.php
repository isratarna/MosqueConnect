<?php

namespace App\Console\Commands;

use App\Models\EventRegistration;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendEventReminders extends Command
{
    protected $signature = 'events:send-reminders';

    protected $description = 'Notify registered attendees about tomorrow’s events';

    public function handle(NotificationService $notifications): int
    {
        $tomorrow = today()->addDay()->toDateString();
        $sent = 0;

        EventRegistration::query()
            ->whereDate('occurrence_date', $tomorrow)
            ->where('status', EventRegistration::STATUS_REGISTERED)
            ->with('event.mosque')
            ->whereHas('event', fn ($query) => $query->published())
            ->orderBy('id')
            ->chunkById(500, function ($registrations) use ($notifications, $tomorrow, &$sent): void {
                foreach ($registrations as $registration) {
                    $event = $registration->event;
                    $sent += (int) $notifications->notifyUser($registration->user_id, $event->mosque, [
                        'type' => Notification::TYPE_EVENT,
                        'title' => 'Event reminder for tomorrow',
                        'message' => "Reminder: {$event->title} is scheduled for tomorrow.",
                        'reference_type' => 'event_reminder_'.$tomorrow,
                        'reference_id' => $registration->id,
                    ]);
                }
            });

        $this->info("Sent {$sent} event reminders.");

        return self::SUCCESS;
    }
}
