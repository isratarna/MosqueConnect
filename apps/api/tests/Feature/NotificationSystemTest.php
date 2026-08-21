<?php

namespace Tests\Feature;

use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_follower_receives_a_mosque_notification(): void
    {
        $user = User::factory()->create();
        $mosque = Mosque::factory()->create();
        Follower::factory()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
        ]);

        $created = $this->service()->notifyMosqueFollowers($mosque, $this->notificationData());

        $this->assertSame(1, $created);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_ANNOUNCEMENT,
            'title' => 'Important mosque update',
            'reference_type' => 'announcement',
            'reference_id' => 42,
            'is_read' => false,
        ]);

        $notification = Notification::firstOrFail();
        $this->assertTrue($notification->user->is($user));
        $this->assertTrue($notification->mosque->is($mosque));
        $this->assertTrue($user->notifications->contains($notification));
        $this->assertTrue($mosque->notifications->contains($notification));
    }

    public function test_non_follower_does_not_receive_a_mosque_notification(): void
    {
        $nonFollower = User::factory()->create();
        $mosque = Mosque::factory()->create();

        $created = $this->service()->notifyMosqueFollowers($mosque, $this->notificationData());

        $this->assertSame(0, $created);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $nonFollower->id,
            'mosque_id' => $mosque->id,
        ]);
    }

    public function test_user_only_sees_their_own_notifications(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $mosque = Mosque::factory()->create();
        $ownNotifications = Notification::factory()->count(2)->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
        ]);
        $otherNotification = Notification::factory()->create([
            'user_id' => $otherUser->id,
            'mosque_id' => $mosque->id,
        ]);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $returnedIds = collect($response->json('data'))->pluck('id');
        $this->assertEqualsCanonicalizing($ownNotifications->modelKeys(), $returnedIds->all());
        $this->assertNotContains($otherNotification->id, $returnedIds);
    }

    public function test_user_cannot_access_another_users_notification(): void
    {
        $user = User::factory()->create();
        $notification = Notification::factory()->create([
            'user_id' => User::factory()->create()->id,
        ]);
        Sanctum::actingAs($user);

        $this->patchJson("/api/notifications/{$notification->id}/read")
            ->assertNotFound();

        $this->assertDatabaseHas('notifications', [
            'id' => $notification->id,
            'is_read' => false,
        ]);
    }

    public function test_user_can_mark_one_notification_as_read(): void
    {
        $user = User::factory()->create();
        $notification = Notification::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->patchJson("/api/notifications/{$notification->id}/read")
            ->assertOk()
            ->assertJsonPath('message', 'Notification marked as read.')
            ->assertJsonPath('data.id', $notification->id)
            ->assertJsonPath('data.is_read', true);

        $this->assertDatabaseHas('notifications', [
            'id' => $notification->id,
            'user_id' => $user->id,
            'is_read' => true,
        ]);
    }

    public function test_user_can_mark_all_of_their_notifications_as_read(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        Notification::factory()->count(2)->create([
            'user_id' => $user->id,
            'is_read' => false,
        ]);
        Notification::factory()->read()->create(['user_id' => $user->id]);
        $otherNotification = Notification::factory()->create([
            'user_id' => $otherUser->id,
            'is_read' => false,
        ]);
        Sanctum::actingAs($user);

        $this->patchJson('/api/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('message', 'All notifications marked as read.')
            ->assertJsonPath('updated_count', 2);

        $this->assertSame(0, $user->notifications()->where('is_read', false)->count());
        $this->assertDatabaseHas('notifications', [
            'id' => $otherNotification->id,
            'is_read' => false,
        ]);
    }

    public function test_unread_count_only_includes_the_current_users_unread_notifications(): void
    {
        $user = User::factory()->create();
        Notification::factory()->count(3)->create([
            'user_id' => $user->id,
            'is_read' => false,
        ]);
        Notification::factory()->read()->count(2)->create(['user_id' => $user->id]);
        Notification::factory()->count(4)->create([
            'user_id' => User::factory()->create()->id,
            'is_read' => false,
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertExactJson(['count' => 3]);
    }

    public function test_notification_list_is_paginated(): void
    {
        $user = User::factory()->create();
        Notification::factory()->count(23)->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->getJson('/api/notifications?per_page=10&page=2')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 23)
            ->assertJsonPath('meta.last_page', 3);
    }

    public function test_newest_notification_appears_first(): void
    {
        $user = User::factory()->create();
        $oldest = Notification::factory()->create([
            'user_id' => $user->id,
            'created_at' => now()->subHours(2),
        ]);
        $newest = Notification::factory()->create([
            'user_id' => $user->id,
            'created_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.id', $newest->id)
            ->assertJsonPath('data.1.id', $oldest->id);
    }

    public function test_unfollow_keeps_history_and_prevents_future_notifications(): void
    {
        $user = User::factory()->create();
        $mosque = Mosque::factory()->create();
        Follower::factory()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
        ]);

        $this->assertSame(1, $this->service()->notifyMosqueFollowers(
            $mosque,
            $this->notificationData(['title' => 'Before unfollow']),
        ));

        Sanctum::actingAs($user);
        $this->deleteJson("/api/mosques/{$mosque->id}/follow")->assertOk();

        $this->assertSame(0, $this->service()->notifyMosqueFollowers(
            $mosque,
            $this->notificationData(['title' => 'After unfollow']),
        ));

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'title' => 'Before unfollow',
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'title' => 'After unfollow',
        ]);
    }

    public function test_notification_endpoints_require_authentication(): void
    {
        $notification = Notification::factory()->create();

        $this->getJson('/api/notifications')->assertUnauthorized();
        $this->getJson('/api/notifications/unread-count')->assertUnauthorized();
        $this->patchJson('/api/notifications/read-all')->assertUnauthorized();
        $this->patchJson("/api/notifications/{$notification->id}/read")->assertUnauthorized();
    }

    public function test_service_rejects_frontend_selected_recipients(): void
    {
        $this->expectException(ValidationException::class);

        $this->service()->notifyMosqueFollowers(
            Mosque::factory()->create(),
            $this->notificationData(['notify_users' => [1, 2, 3]]),
        );
    }

    public function test_notification_pagination_input_is_validated(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/notifications?per_page=1000&page=0')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['per_page', 'page']);
    }

    private function service(): NotificationService
    {
        return app(NotificationService::class);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function notificationData(array $overrides = []): array
    {
        return [
            'type' => Notification::TYPE_ANNOUNCEMENT,
            'title' => 'Important mosque update',
            'message' => 'There is an important update for mosque followers.',
            'reference_type' => 'announcement',
            'reference_id' => 42,
            ...$overrides,
        ];
    }
}
