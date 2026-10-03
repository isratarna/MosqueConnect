<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\Event;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use App\Services\FeedService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PersonalFeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_feed_requires_authentication(): void
    {
        $this->getJson('/api/me/feed')->assertUnauthorized();
    }

    public function test_the_feed_only_contains_updates_from_mosques_the_user_follows(): void
    {
        $user = User::factory()->create();
        [$followed] = $this->mosques();
        Follower::factory()->create(['mosque_id' => $followed->id, 'user_id' => $user->id]);
        $ignored = Mosque::factory()->create();

        $mine = $this->announcement($followed, ['title' => 'Feed timetable change']);
        $theirs = $this->announcement($ignored, ['title' => 'Someone else notice']);

        Sanctum::actingAs($user);
        $this->getJson('/api/me/feed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id)
            ->assertJsonPath('data.0.type', FeedService::TYPE_ANNOUNCEMENT)
            ->assertJsonPath('data.0.title', 'Feed timetable change')
            ->assertJsonPath('data.0.mosque.id', $followed->id)
            ->assertJsonMissing(['id' => $theirs->id]);
    }

    public function test_the_feed_merges_every_source_newest_first(): void
    {
        $user = User::factory()->create();
        [$mosque] = $this->mosques();
        Follower::factory()->create(['mosque_id' => $mosque->id, 'user_id' => $user->id]);

        $this->announcement($mosque, ['title' => 'Older notice', 'published_at' => now()->subHours(3)]);
        $this->announcement($mosque, ['title' => 'Newest notice', 'published_at' => now()->subMinutes(5)]);
        Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Study circle',
            'event_date' => now()->addDays(3)->toDateString(),
            'created_at' => now()->subHours(2),
        ]);
        Campaign::factory()->active()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Winter appeal',
            'starts_on' => now()->subDay()->toDateString(),
            'created_at' => now()->subHour(),
        ]);
        Notification::factory()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_PRAYER_SCHEDULE,
            'title' => 'Ramadan timetable updated',
            'created_at' => now()->subMinutes(30),
        ]);

        Sanctum::actingAs($user);
        $this->getJson('/api/me/feed')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.0.title', 'Newest notice')
            ->assertJsonPath('data.0.type', FeedService::TYPE_ANNOUNCEMENT)
            ->assertJsonPath('data.1.title', 'Ramadan timetable updated')
            ->assertJsonPath('data.1.type', FeedService::TYPE_PRAYER_SCHEDULE)
            ->assertJsonPath('data.2.title', 'Winter appeal')
            ->assertJsonPath('data.2.type', FeedService::TYPE_CAMPAIGN)
            ->assertJsonPath('data.3.title', 'Study circle')
            ->assertJsonPath('data.3.type', FeedService::TYPE_EVENT)
            ->assertJsonPath('data.4.title', 'Older notice')
            ->assertJsonPath('data.4.type', FeedService::TYPE_ANNOUNCEMENT);
    }

    public function test_the_feed_skips_drafts_hidden_events_ended_campaigns_and_other_peoples_notifications(): void
    {
        $user = User::factory()->create();
        [$mosque] = $this->mosques();
        Follower::factory()->create(['mosque_id' => $mosque->id, 'user_id' => $user->id]);

        $this->announcement($mosque, ['title' => 'Draft only', 'status' => Announcement::STATUS_DRAFT]);
        $this->announcement($mosque, ['title' => 'Moderated away', 'moderation_status' => Announcement::MODERATION_PENDING]);
        $this->announcement($mosque, ['title' => 'Expired', 'expires_at' => now()->subDay()]);
        Event::factory()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Yesterday gathering',
            'event_date' => now()->subDay()->toDateString(),
        ]);
        Event::factory()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Unapproved gathering',
            'event_date' => now()->addDay()->toDateString(),
            'moderation_status' => Event::MODERATION_PENDING,
        ]);
        Campaign::factory()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Finished appeal',
            'status' => Campaign::STATUS_ACTIVE,
            'starts_on' => now()->subDays(10)->toDateString(),
            'ends_on' => now()->subDay()->toDateString(),
        ]);
        Notification::factory()->create([
            'user_id' => User::factory()->create()->id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_PRAYER_SCHEDULE,
            'title' => 'Not my notification',
        ]);
        $live = $this->announcement($mosque, ['title' => 'Live notice']);

        Sanctum::actingAs($user);
        $this->getJson('/api/me/feed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $live->id);
    }

    public function test_the_feed_paginates_with_a_cursor_without_repeating_or_skipping_items(): void
    {
        $user = User::factory()->create();
        [$mosque] = $this->mosques();
        Follower::factory()->create(['mosque_id' => $mosque->id, 'user_id' => $user->id]);

        foreach (range(1, 7) as $index) {
            $this->announcement($mosque, [
                'title' => "Notice {$index}",
                'published_at' => now()->subMinutes(10 - $index),
            ]);
        }

        Sanctum::actingAs($user);

        $titles = [];
        $next = null;
        $pages = 0;

        do {
            $response = $this->getJson('/api/me/feed?per_page=3'.($next ? '&cursor='.$next : ''))->assertOk();
            $page = $response->json('data');
            $titles = [...$titles, ...array_column($page, 'title')];
            $next = $response->json('meta.next_cursor');
            $pages++;
        } while ($next !== null && $pages < 10);

        $this->assertSame(3, $pages);
        $this->assertCount(7, $titles);
        $this->assertSame($titles, array_values(array_unique($titles)));
        $this->assertSame([
            'Notice 7', 'Notice 6', 'Notice 5', 'Notice 4', 'Notice 3', 'Notice 2', 'Notice 1',
        ], $titles);
    }

    public function test_the_feed_cursor_holds_still_when_new_items_arrive(): void
    {
        $user = User::factory()->create();
        [$mosque] = $this->mosques();
        Follower::factory()->create(['mosque_id' => $mosque->id, 'user_id' => $user->id]);

        foreach (range(1, 4) as $index) {
            $this->announcement($mosque, ['title' => "Notice {$index}", 'published_at' => now()->subMinutes(10 - $index)]);
        }

        Sanctum::actingAs($user);
        $first = $this->getJson('/api/me/feed?per_page=2')->assertOk();
        $cursor = $first->json('meta.next_cursor');

        $this->assertNotNull($cursor);
        $this->assertSame(['Notice 4', 'Notice 3'], array_column($first->json('data'), 'title'));

        // A newer announcement must not shift the next page under the reader.
        $this->announcement($mosque, ['title' => 'Notice 5', 'published_at' => now()]);

        $second = $this->getJson('/api/me/feed?per_page=2&cursor='.$cursor)->assertOk();
        $this->assertSame(['Notice 2', 'Notice 1'], array_column($second->json('data'), 'title'));
        $this->assertNull($second->json('meta.next_cursor'));
    }

    public function test_the_feed_orders_items_sharing_a_timestamp_consistently(): void
    {
        $user = User::factory()->create();
        [$mosque] = $this->mosques();
        Follower::factory()->create(['mosque_id' => $mosque->id, 'user_id' => $user->id]);

        Carbon::setTestNow($moment = Carbon::parse('2026-03-01 09:00:00'));

        $this->announcement($mosque, ['title' => 'Announcement', 'published_at' => $moment]);
        Event::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Event',
            'event_date' => now()->addDay()->toDateString(),
            'created_at' => $moment,
        ]);
        Campaign::factory()->active()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Campaign',
            'starts_on' => $moment->copy()->subDay()->toDateString(),
            'created_at' => $moment,
        ]);
        Notification::factory()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_PRAYER_SCHEDULE,
            'title' => 'Schedule change',
            'created_at' => $moment,
        ]);

        Sanctum::actingAs($user);

        // Identical timestamps must not be duplicated or lost across the
        // tie-break boundary, whatever the page size.
        foreach ([1, 2, 3, 4] as $perPage) {
            $titles = [];
            $next = null;
            $pages = 0;

            do {
                $response = $this->getJson("/api/me/feed?per_page={$perPage}".($next ? '&cursor='.$next : ''))->assertOk();
                $titles = [...$titles, ...array_column($response->json('data'), 'title')];
                $next = $response->json('meta.next_cursor');
                $pages++;
            } while ($next !== null && $pages < 10);

            $this->assertSame(['Announcement', 'Event', 'Campaign', 'Schedule change'], $titles, "page size {$perPage}");
        }

        Carbon::setTestNow();
    }

    public function test_the_feed_page_size_is_validated(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/me/feed?per_page=100')->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
        $this->getJson('/api/me/feed?cursor=not-a-cursor')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_an_empty_follow_list_returns_an_empty_page(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/me/feed')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.next_cursor', null);
    }

    /** @return array{0: Mosque, 1: Mosque} */
    private function mosques(): array
    {
        return [Mosque::factory()->create(), Mosque::factory()->create()];
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function announcement(Mosque $mosque, array $attributes = []): Announcement
    {
        return Announcement::factory()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Announcement',
            'body' => 'Body text.',
            'status' => Announcement::STATUS_PUBLISHED,
            'moderation_status' => Announcement::MODERATION_APPROVED,
            'published_at' => now(),
            ...$attributes,
        ]);
    }
}
