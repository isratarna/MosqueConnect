<?php

namespace Tests\Feature;

use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrossFeatureNotificationTriggerTest extends TestCase
{
    use RefreshDatabase;

    public function test_published_announcement_notifies_only_mosque_followers_once(): void
    {
        [$mosque, $follower, $nonFollower] = $this->mosqueWithFollowerAndNonFollower();

        $created = $this->service()->notifyAnnouncementPublished($mosque, 101, 'Eid prayer arrangements');
        $createdAgain = $this->service()->notifyAnnouncementPublished($mosque, 101, 'Eid prayer arrangements');

        $this->assertSame(1, $created);
        $this->assertSame(0, $createdAgain);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $follower->id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_ANNOUNCEMENT,
            'title' => 'New Announcement: Eid prayer arrangements',
            'message' => "{$mosque->name} published a new announcement: Eid prayer arrangements.",
            'reference_type' => Notification::REFERENCE_ANNOUNCEMENT,
            'reference_id' => 101,
        ]);
        $this->assertNotNotified($nonFollower, Notification::REFERENCE_ANNOUNCEMENT, 101);
    }

    public function test_prayer_schedule_change_notifies_only_mosque_followers_once(): void
    {
        [$mosque, $follower, $nonFollower] = $this->mosqueWithFollowerAndNonFollower();

        $created = $this->service()->notifyPrayerScheduleChanged($mosque, 202, 'Fajr is now at 4:45 AM');
        $createdAgain = $this->service()->notifyPrayerScheduleChanged($mosque, 202, 'Fajr is now at 4:45 AM');

        $this->assertSame(1, $created);
        $this->assertSame(0, $createdAgain);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $follower->id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_PRAYER_SCHEDULE,
            'title' => 'Prayer Schedule Updated',
            'message' => "{$mosque->name} updated its prayer schedule: Fajr is now at 4:45 AM.",
            'reference_type' => Notification::REFERENCE_PRAYER_SCHEDULE,
            'reference_id' => 202,
        ]);
        $this->assertNotNotified($nonFollower, Notification::REFERENCE_PRAYER_SCHEDULE, 202);
    }

    public function test_published_campaign_notifies_only_mosque_followers_once(): void
    {
        [$mosque, $follower, $nonFollower] = $this->mosqueWithFollowerAndNonFollower();

        $created = $this->service()->notifyCampaignPublished($mosque, 303, 'Winter relief fund');
        $createdAgain = $this->service()->notifyCampaignPublished($mosque, 303, 'Winter relief fund');

        $this->assertSame(1, $created);
        $this->assertSame(0, $createdAgain);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $follower->id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_CAMPAIGN,
            'title' => 'New Donation Campaign: Winter relief fund',
            'message' => "{$mosque->name} launched a new donation campaign: Winter relief fund.",
            'reference_type' => Notification::REFERENCE_CAMPAIGN,
            'reference_id' => 303,
        ]);
        $this->assertNotNotified($nonFollower, Notification::REFERENCE_CAMPAIGN, 303);
    }

    /**
     * @return array{Mosque, User, User}
     */
    private function mosqueWithFollowerAndNonFollower(): array
    {
        $mosque = Mosque::factory()->create();
        $follower = User::factory()->create();
        $nonFollower = User::factory()->create();

        Follower::factory()->create([
            'mosque_id' => $mosque->id,
            'user_id' => $follower->id,
        ]);

        return [$mosque, $follower, $nonFollower];
    }

    private function assertNotNotified(User $user, string $referenceType, int $referenceId): void
    {
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $user->id,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
        ]);
    }

    private function service(): NotificationService
    {
        return app(NotificationService::class);
    }
}
