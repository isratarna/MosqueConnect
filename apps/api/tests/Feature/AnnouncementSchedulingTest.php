<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnnouncementSchedulingTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_announcement_scheduled_for_later_is_hidden_until_it_is_due(): void
    {
        [, $mosque] = $this->actingAdmin();
        $due = Carbon::now()->addDay();

        $id = $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Winter timetable change',
            'body' => 'New timings start next week.',
            'status' => Announcement::STATUS_PUBLISHED,
            'publish_at' => $due->toDateTimeString(),
            'expires_at' => $due->copy()->addDays(7)->toDateTimeString(),
        ])->assertCreated()
            ->assertJsonPath('data.status', Announcement::STATUS_SCHEDULED)
            ->assertJsonPath('data.published_at', null)
            ->json('data.id');

        $this->getJson("/api/mosques/{$mosque->id}/announcements")->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/announcements')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/announcements/{$id}")->assertNotFound();

        Carbon::setTestNow($due->copy()->addMinute());

        // The publisher command is what makes a due announcement public.
        $this->artisan('announcements:publish-scheduled')->assertSuccessful();

        $this->getJson("/api/mosques/{$mosque->id}/announcements")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Winter timetable change');

        // It disappears again once it expires.
        Carbon::setTestNow($due->copy()->addDays(8));

        $this->getJson("/api/mosques/{$mosque->id}/announcements")->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/announcements/{$id}")->assertNotFound();

        Carbon::setTestNow();
    }

    public function test_the_publisher_command_publishes_only_announcements_that_are_due(): void
    {
        [, $mosque] = $this->actingAdmin();
        $this->announcement($mosque, ['status' => Announcement::STATUS_SCHEDULED, 'publish_at' => now()->addHour()]);
        $due = $this->announcement($mosque, ['status' => Announcement::STATUS_SCHEDULED, 'publish_at' => now()->subMinute()]);
        $draft = $this->announcement($mosque, ['status' => Announcement::STATUS_DRAFT]);
        $expired = $this->announcement($mosque, [
            'status' => Announcement::STATUS_SCHEDULED,
            'publish_at' => now()->subHour(),
            'expires_at' => now()->subMinute(),
        ]);

        $this->artisan('announcements:publish-scheduled')->assertSuccessful();

        $this->assertSame(Announcement::STATUS_PUBLISHED, $due->refresh()->status);
        $this->assertNotNull($due->refresh()->published_at);
        $this->assertSame(Announcement::STATUS_DRAFT, $draft->refresh()->status);
        $this->assertNull($draft->refresh()->published_at);
        $this->assertSame(Announcement::STATUS_SCHEDULED, $expired->refresh()->status);
        $this->assertNull($expired->refresh()->published_at);
    }

    public function test_publishing_a_due_announcement_notifies_followers_once(): void
    {
        [, $mosque] = $this->actingAdmin();
        $follower = User::factory()->create();
        Follower::factory()->create(['mosque_id' => $mosque->id, 'user_id' => $follower->id]);
        $announcement = $this->announcement($mosque, [
            'status' => Announcement::STATUS_SCHEDULED,
            'publish_at' => now()->subMinute(),
        ]);

        $this->artisan('announcements:publish-scheduled')->assertSuccessful();
        $this->artisan('announcements:publish-scheduled')->assertSuccessful();

        $this->assertSame(1, Notification::query()
            ->where('user_id', $follower->id)
            ->where('type', Notification::TYPE_ANNOUNCEMENT)
            ->count());
        $this->assertSame(Announcement::STATUS_PUBLISHED, $announcement->refresh()->status);
    }

    public function test_an_expiry_before_the_publish_date_is_rejected(): void
    {
        [, $mosque] = $this->actingAdmin();

        $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Backwards',
            'body' => 'Expires before it starts.',
            'status' => Announcement::STATUS_PUBLISHED,
            'publish_at' => now()->addDays(3)->toDateTimeString(),
            'expires_at' => now()->addDay()->toDateTimeString(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('expires_at');
    }

    public function test_expired_announcements_stay_out_of_the_admin_list_but_are_kept(): void
    {
        [, $mosque] = $this->actingAdmin();
        $this->announcement($mosque, [
            'status' => Announcement::STATUS_PUBLISHED,
            'published_at' => now()->subDays(10),
            'expires_at' => now()->subDay(),
        ]);
        $live = $this->announcement($mosque, ['status' => Announcement::STATUS_PUBLISHED, 'published_at' => now()]);

        $this->getJson("/api/admin/mosques/{$mosque->id}/announcements")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $live->id);

        $this->assertSame(1, Announcement::query()->expired()->count());
    }

    public function test_a_mosque_can_pin_at_most_three_announcements(): void
    {
        [, $mosque] = $this->actingAdmin();

        foreach (range(1, Announcement::MAX_PINNED) as $index) {
            $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
                'title' => "Pinned {$index}",
                'body' => 'Keep me at the top.',
                'status' => Announcement::STATUS_PUBLISHED,
                'is_pinned' => true,
            ])->assertCreated()->assertJsonPath('data.is_pinned', true);
        }

        $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'One too many',
            'body' => 'Nope.',
            'status' => Announcement::STATUS_PUBLISHED,
            'is_pinned' => true,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('is_pinned');

        $this->assertSame(Announcement::MAX_PINNED, $mosque->announcements()->where('is_pinned', true)->count());

        // Re-pinning an already pinned announcement is still allowed.
        $pinned = $mosque->announcements()->where('is_pinned', true)->firstOrFail();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/announcements/{$pinned->id}", [
            'is_pinned' => true,
        ])->assertOk()->assertJsonPath('data.is_pinned', true);
    }

    public function test_pinned_announcements_come_first_whatever_their_age(): void
    {
        [, $mosque] = $this->actingAdmin();
        $new = $this->announcement($mosque, [
            'status' => Announcement::STATUS_PUBLISHED,
            'published_at' => now(),
            'title' => 'Fresh',
        ]);
        $oldPinned = $this->announcement($mosque, [
            'status' => Announcement::STATUS_PUBLISHED,
            'published_at' => now()->subDays(30),
            'is_pinned' => true,
            'title' => 'Old but pinned',
        ]);

        $this->getJson("/api/mosques/{$mosque->id}/announcements")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $oldPinned->id)
            ->assertJsonPath('data.1.id', $new->id);
    }

    public function test_an_image_is_stored_replaced_and_deleted_with_the_announcement(): void
    {
        Storage::fake('public');
        [, $mosque] = $this->actingAdmin();

        $id = $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'With a poster',
            'body' => 'Ramadan timetable poster.',
            'status' => Announcement::STATUS_PUBLISHED,
        ])->assertCreated()
            ->assertJsonPath('data.image_url', null)
            ->json('data.id');

        $this->patch("/api/admin/mosques/{$mosque->id}/announcements/{$id}", [
            'image' => UploadedFile::fake()->image('poster.jpg'),
        ])->assertOk()->assertJsonPath('data.image_url', '/storage/'.$mosque->announcements()->firstOrFail()->image_path);

        $first = $mosque->announcements()->firstOrFail()->image_path;
        Storage::disk('public')->assertExists($first);

        // Replacing the image removes the previous file.
        $this->patch("/api/admin/mosques/{$mosque->id}/announcements/{$id}", [
            'image' => UploadedFile::fake()->image('replacement.jpg'),
        ])->assertOk();

        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($mosque->announcements()->firstOrFail()->image_path);

        $last = $mosque->announcements()->firstOrFail()->image_path;
        Storage::disk('public')->assertExists($last);

        $this->deleteJson("/api/admin/mosques/{$mosque->id}/announcements/{$id}")->assertOk();
        Storage::disk('public')->assertMissing($last);
        $this->assertDatabaseMissing('announcements', ['id' => $id]);
    }

    public function test_a_non_image_upload_is_rejected(): void
    {
        Storage::fake('public');
        [, $mosque] = $this->actingAdmin();

        $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Bad upload',
            'body' => 'This is not an image.',
            'status' => Announcement::STATUS_PUBLISHED,
        ])->assertCreated();

        $this->patch("/api/admin/mosques/{$mosque->id}/announcements/{$mosque->announcements()->firstOrFail()->id}", [
            'image' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('image');

        $this->assertNull($mosque->announcements()->firstOrFail()->image_path);
    }

    public function test_deleting_an_announcement_without_an_image_succeeds(): void
    {
        [, $mosque] = $this->actingAdmin();
        $announcement = $this->announcement($mosque, ['status' => Announcement::STATUS_PUBLISHED]);

        $this->deleteJson("/api/admin/mosques/{$mosque->id}/announcements/{$announcement->id}")->assertOk();
        $this->assertDatabaseMissing('announcements', ['id' => $announcement->id]);
    }

    public function test_a_janazah_is_high_urgency_by_default_and_gets_a_janazah_title(): void
    {
        [, $mosque] = $this->actingAdmin();

        $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Janazah notice',
            'body' => 'Inna lillahi wa inna ilayhi rajiun.',
            'category' => Announcement::CATEGORY_JANAZAH,
            'status' => Announcement::STATUS_PUBLISHED,
        ])->assertCreated()
            ->assertJsonPath('data.category', Announcement::CATEGORY_JANAZAH)
            ->assertJsonPath('data.urgency', Announcement::URGENCY_HIGH);

        $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'General notice',
            'body' => 'Just information.',
            'category' => Announcement::CATEGORY_GENERAL,
            'status' => Announcement::STATUS_PUBLISHED,
        ])->assertCreated()
            ->assertJsonPath('data.urgency', Announcement::URGENCY_LOW);

        // An explicit urgency is never overwritten.
        $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Janazah, calmly',
            'body' => 'Notified already.',
            'category' => Announcement::CATEGORY_JANAZAH,
            'urgency' => Announcement::URGENCY_MEDIUM,
            'status' => Announcement::STATUS_PUBLISHED,
        ])->assertCreated()
            ->assertJsonPath('data.urgency', Announcement::URGENCY_MEDIUM);
    }

    public function test_an_unknown_category_or_status_is_rejected(): void
    {
        [, $mosque] = $this->actingAdmin();

        $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Wrong category',
            'body' => 'Nope.',
            'category' => 'lunar',
            'status' => Announcement::STATUS_PUBLISHED,
        ])->assertUnprocessable()->assertJsonValidationErrors('category');

        // A client cannot force the scheduled status; it is derived.
        $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Forced status',
            'body' => 'Nope.',
            'status' => Announcement::STATUS_SCHEDULED,
        ])->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_a_draft_is_never_visible_publicly(): void
    {
        [, $mosque] = $this->actingAdmin();
        $draft = $this->announcement($mosque, ['status' => Announcement::STATUS_DRAFT]);

        $this->getJson("/api/mosques/{$mosque->id}/announcements")->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/announcements')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/announcements/{$draft->id}")->assertNotFound();
    }

    public function test_an_unapproved_announcement_is_hidden_from_the_public(): void
    {
        [, $mosque] = $this->actingAdmin();
        $pending = $this->announcement($mosque, [
            'status' => Announcement::STATUS_PUBLISHED,
            'moderation_status' => Announcement::MODERATION_PENDING,
        ]);

        $this->getJson("/api/mosques/{$mosque->id}/announcements")->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/announcements/{$pending->id}")->assertNotFound();
    }

    public function test_publishing_and_unpublishing_flips_visibility(): void
    {
        [, $mosque] = $this->actingAdmin();
        $announcement = $this->announcement($mosque, ['status' => Announcement::STATUS_DRAFT]);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/announcements/{$announcement->id}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', Announcement::STATUS_PUBLISHED);

        $this->getJson("/api/mosques/{$mosque->id}/announcements")->assertOk()->assertJsonCount(1, 'data');

        $this->patchJson("/api/admin/mosques/{$mosque->id}/announcements/{$announcement->id}/unpublish")
            ->assertOk()
            ->assertJsonPath('data.status', Announcement::STATUS_DRAFT);

        $this->getJson("/api/mosques/{$mosque->id}/announcements")->assertOk()->assertJsonCount(0, 'data');
    }

    /** @return array{0: User, 1: Mosque} */
    private function actingAdmin(): array
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        return [$admin, $mosque];
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
            'status' => Announcement::STATUS_DRAFT,
            'published_at' => null,
            ...$attributes,
        ]);
    }
}
