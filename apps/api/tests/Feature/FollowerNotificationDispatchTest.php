<?php

namespace Tests\Feature;

use App\Jobs\NotifyMosqueFollowers;
use App\Models\Campaign;
use App\Models\Event;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\PrayerTime;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FollowerNotificationDispatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_publishing_each_content_type_dispatches_a_follower_job(): void
    {
        Queue::fake();
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $announcement = $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Ramadan timetable',
            'body' => 'Updated prayer times.',
            'status' => 'published',
        ])->assertCreated()->json('data.id');

        $event = Event::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'status' => Event::STATUS_DRAFT,
        ]);
        $this->patchJson("/api/admin/mosques/{$mosque->id}/events/{$event->id}/publish")->assertOk();

        $campaign = Campaign::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
        ]);
        $this->patchJson("/api/admin/mosques/{$mosque->id}/campaigns/{$campaign->id}/activate")->assertOk();

        $schedule = ['prayer_schedule' => [[
            'prayer' => PrayerTime::PRAYER_FAJR,
            'adhan_time' => '04:15',
            'jamaat_time' => '04:45',
        ]]];
        $this->putJson("/api/admin/mosques/{$mosque->id}/prayer-schedule", $schedule)->assertOk();
        $this->putJson("/api/admin/mosques/{$mosque->id}/prayer-schedule", $schedule)->assertOk();

        Queue::assertPushedTimes(NotifyMosqueFollowers::class, 4);
        Queue::assertPushed(NotifyMosqueFollowers::class, fn (NotifyMosqueFollowers $job): bool =>
            $job->mosqueId === $mosque->id
            && $job->type === Notification::TYPE_ANNOUNCEMENT
            && $job->reference === ['type' => Notification::REFERENCE_ANNOUNCEMENT, 'id' => $announcement]
        );
        Queue::assertPushed(NotifyMosqueFollowers::class, fn (NotifyMosqueFollowers $job): bool => $job->type === Notification::TYPE_EVENT);
        Queue::assertPushed(NotifyMosqueFollowers::class, fn (NotifyMosqueFollowers $job): bool => $job->type === Notification::TYPE_CAMPAIGN);
        Queue::assertPushed(NotifyMosqueFollowers::class, fn (NotifyMosqueFollowers $job): bool => $job->type === Notification::TYPE_PRAYER_SCHEDULE);
    }

    public function test_follower_job_can_run_synchronously_and_persist_notifications(): void
    {
        $mosque = Mosque::factory()->create();
        $follower = Follower::factory()->create(['mosque_id' => $mosque->id]);
        $job = new NotifyMosqueFollowers(
            $mosque->id,
            Notification::TYPE_ANNOUNCEMENT,
            'New Announcement: Iftar times',
            'Iftar times were updated.',
            ['type' => Notification::REFERENCE_ANNOUNCEMENT, 'id' => 710],
        );

        $job->handle(app(NotificationService::class));

        $this->assertDatabaseHas('notifications', [
            'user_id' => $follower->user_id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_ANNOUNCEMENT,
            'reference_id' => 710,
            'message' => 'Iftar times were updated.',
        ]);
    }
}