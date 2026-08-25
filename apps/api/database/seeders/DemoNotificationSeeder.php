<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\Event;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Database\Seeder;

class DemoNotificationSeeder extends Seeder
{
    public function run(): void
    {
        $notifications = app(NotificationService::class);

        Event::query()
            ->where('status', Event::STATUS_PUBLISHED)
            ->whereDate('event_date', '>=', today())
            ->whereIn('title', [
                'Weekly Tafsir after Fajr',
                'Weekend Quran class for children',
                'Youth Halaqah: surviving exam season',
                'Chattogram flood relief packing',
            ])
            ->get()
            ->each(fn (Event $event): int => $notifications->notifyEventPublished($event));

        Announcement::query()
            ->where('status', Announcement::STATUS_PUBLISHED)
            ->whereIn('title', [
                'Additional Jumuah this Friday',
                'Women’s prayer floor now open daily',
                'AC servicing Thursday afternoon',
                'Flood-relief goods after Jumuah',
            ])
            ->with('mosque')
            ->get()
            ->each(fn (Announcement $announcement): int => $notifications->notifyAnnouncementPublished(
                $announcement->mosque,
                $announcement->id,
                $announcement->title,
            ));

        Campaign::query()
            ->where('status', Campaign::STATUS_ACTIVE)
            ->with('mosque')
            ->get()
            ->each(fn (Campaign $campaign): int => $notifications->notifyCampaignPublished(
                $campaign->mosque,
                $campaign->id,
                $campaign->title,
            ));

        Mosque::query()
            ->whereIn('name', ['Baitul Mukarram National Mosque', 'Gulshan Society Mosque'])
            ->with('prayerTimes')
            ->get()
            ->each(function (Mosque $mosque) use ($notifications): void {
                $prayerTime = $mosque->prayerTimes->firstWhere('prayer', 'fajr');

                $notifications->notifyPrayerScheduleChanged(
                    $mosque,
                    $prayerTime->id,
                    'Fajr jamaat has been adjusted for the current season',
                );
            });

        User::query()
            ->where('role', User::ROLE_NORMAL_USER)
            ->get()
            ->each(function (User $user): void {
                $follow = Follower::query()->where('user_id', $user->id)->oldest('id')->first();

                Notification::query()->updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'mosque_id' => $follow->mosque_id,
                        'type' => Notification::TYPE_SYSTEM,
                        'title' => 'Welcome to MosqueConnect',
                    ],
                    [
                        'message' => 'Your Dhaka and Chattogram mosque updates are ready. Follow another mosque at any time to personalise this feed.',
                        'reference_type' => null,
                        'reference_id' => null,
                        'is_read' => false,
                    ],
                );
            });

        Notification::query()
            ->orderBy('id')
            ->get()
            ->each(function (Notification $notification, int $index): void {
                $notification->update(['is_read' => $index % 3 === 0]);
            });
    }
}
