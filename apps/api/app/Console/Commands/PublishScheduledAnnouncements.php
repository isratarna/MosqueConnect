<?php

namespace App\Console\Commands;

use App\Models\Announcement;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class PublishScheduledAnnouncements extends Command
{
    protected $signature = 'announcements:publish-scheduled';

    protected $description = 'Publish due announcements and notify mosque followers';

    public function handle(NotificationService $notifications): int
    {
        Announcement::query()
            ->where('status', Announcement::STATUS_SCHEDULED)
            ->whereNotNull('publish_at')
            ->where('publish_at', '<=', now())
            // A window that has already closed is left alone rather than
            // published, so followers are never told about a dead notice.
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->with('mosque:id,name')
            ->orderBy('id')
            ->chunkById(100, function ($announcements) use ($notifications): void {
                foreach ($announcements as $announcement) {
                    $announcement->status = Announcement::STATUS_PUBLISHED;
                    $announcement->published_at = $announcement->publish_at;
                    $announcement->save();

                    if ($announcement->moderation_status === Announcement::MODERATION_APPROVED) {
                        $notifications->notifyAnnouncementPublished(
                            $announcement->mosque,
                            $announcement->id,
                            $announcement->title,
                            $announcement->category,
                        );
                    }
                }
            });

        return self::SUCCESS;
    }
}
