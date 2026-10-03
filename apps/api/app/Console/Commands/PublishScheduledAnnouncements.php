<?php

namespace App\Console\Commands;

use App\Models\Announcement;
use App\Models\Notification;
use App\Jobs\NotifyMosqueFollowers;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class PublishScheduledAnnouncements extends Command
{
    protected $signature = 'announcements:publish-scheduled';

    protected $description = 'Publish due announcements and notify mosque followers';

    public function handle(): int
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
            ->chunkById(100, function ($announcements): void {
                foreach ($announcements as $announcement) {
                    $announcement->status = Announcement::STATUS_PUBLISHED;
                    $announcement->published_at = $announcement->publish_at;
                    $announcement->save();

                    if ($announcement->moderation_status === Announcement::MODERATION_APPROVED) {
                        $title = $announcement->category === Announcement::CATEGORY_JANAZAH
                            ? 'Janazah: '.$announcement->title
                            : $announcement->title;

                        dispatch(new NotifyMosqueFollowers(
                            $announcement->mosque_id,
                            Notification::TYPE_ANNOUNCEMENT,
                            Str::limit("New Announcement: {$title}", 255, ''),
                            Str::limit("{$announcement->mosque->name} published a new announcement: {$title}.", 10000, ''),
                            ['type' => Notification::REFERENCE_ANNOUNCEMENT, 'id' => $announcement->id],
                        ))->afterCommit();
                    }
                }
            });

        return self::SUCCESS;
    }
}
