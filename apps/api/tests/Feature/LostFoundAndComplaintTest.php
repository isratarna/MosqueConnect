<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\ContentReport;
use App\Models\LostFoundItem;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LostFoundAndComplaintTest extends TestCase
{
    use RefreshDatabase;

    private function adminOf(Mosque $mosque): User
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque->update(['verification_status' => Mosque::VERIFICATION_VERIFIED]);
        $mosque->owner_id = $admin->id;
        $mosque->save();

        return $admin;
    }

    // ---- Lost & found -------------------------------------------------

    public function test_public_list_shows_open_approved_items_and_filters(): void
    {
        $mosque = Mosque::factory()->create();
        $phone = LostFoundItem::factory()->create(['mosque_id' => $mosque->id, 'type' => 'lost', 'category' => 'phone']);
        LostFoundItem::factory()->create(['mosque_id' => $mosque->id, 'type' => 'found', 'category' => 'keys']);
        LostFoundItem::factory()->create(['status' => LostFoundItem::STATUS_RETURNED]);
        LostFoundItem::factory()->create(['moderation_status' => LostFoundItem::MODERATION_REJECTED]);

        $this->getJson('/api/lost-found')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/lost-found?type=lost')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $phone->id);
        $this->getJson('/api/lost-found?category=keys')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/lost-found?mosque_id={$mosque->id}")->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/lost-found?status=returned')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/lost-found?type=nope')->assertUnprocessable();
    }

    public function test_show_hides_rejected_items_from_the_public(): void
    {
        $item = LostFoundItem::factory()->create(['moderation_status' => LostFoundItem::MODERATION_REJECTED]);

        $this->getJson("/api/lost-found/{$item->id}")->assertNotFound();

        Sanctum::actingAs($item->user);
        $this->getJson("/api/lost-found/{$item->id}")->assertOk()->assertJsonPath('data.is_owner', true);
    }

    public function test_logged_in_user_can_post_an_item_with_a_photo(): void
    {
        Storage::fake('local');
        $mosque = Mosque::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/lost-found', [
            'mosque_id' => $mosque->id,
            'type' => 'lost',
            'title' => 'Black Samsung phone',
            'description' => 'Left it near the wudu area after Maghrib.',
            'category' => 'phone',
            'occurred_on' => today()->toDateString(),
            'photo' => UploadedFile::fake()->image('phone.jpg'),
        ])->assertCreated()
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.mosque.id', $mosque->id);

        $item = LostFoundItem::query()->findOrFail($response->json('data.id'));
        Storage::disk('local')->assertExists($item->photo_path);
        $this->assertNotNull($response->json('data.photo_url'));
        $this->get("/api/lost-found/{$item->id}/photo")->assertOk();
    }

    public function test_guests_cannot_post_and_dates_cannot_be_in_the_future(): void
    {
        $this->postJson('/api/lost-found', [])->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/lost-found', [
            'type' => 'found', 'title' => 'Keys', 'description' => 'A bunch of keys', 'category' => 'keys',
            'occurred_on' => today()->addDay()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors('occurred_on');
    }

    public function test_only_the_owner_can_edit_an_item(): void
    {
        $item = LostFoundItem::factory()->create();

        Sanctum::actingAs(User::factory()->create());
        $this->patchJson("/api/lost-found/{$item->id}", ['title' => 'Hijacked'])->assertForbidden();

        Sanctum::actingAs($item->user);
        $this->patchJson("/api/lost-found/{$item->id}", ['title' => 'Blue umbrella'])
            ->assertOk()->assertJsonPath('data.title', 'Blue umbrella');
    }

    public function test_owner_or_that_mosques_admin_can_mark_an_item_returned(): void
    {
        $mosque = Mosque::factory()->create();
        $admin = $this->adminOf($mosque);
        $otherAdmin = $this->adminOf(Mosque::factory()->create());
        $item = LostFoundItem::factory()->create(['mosque_id' => $mosque->id]);

        Sanctum::actingAs(User::factory()->create());
        $this->patchJson("/api/lost-found/{$item->id}/status", ['status' => 'returned'])->assertForbidden();

        Sanctum::actingAs($otherAdmin);
        $this->patchJson("/api/lost-found/{$item->id}/status", ['status' => 'returned'])->assertForbidden();

        Sanctum::actingAs($admin);
        $this->patchJson("/api/lost-found/{$item->id}/status", ['status' => 'returned'])
            ->assertOk()->assertJsonPath('data.status', 'returned');

        Sanctum::actingAs($item->user);
        $this->patchJson("/api/lost-found/{$item->id}/status", ['status' => 'open'])
            ->assertOk()->assertJsonPath('data.status', 'open');
    }

    public function test_mosque_admin_lists_items_at_their_mosque_only(): void
    {
        $mosque = Mosque::factory()->create();
        $admin = $this->adminOf($mosque);
        LostFoundItem::factory()->count(2)->create(['mosque_id' => $mosque->id]);
        $other = Mosque::factory()->create();
        LostFoundItem::factory()->create(['mosque_id' => $other->id]);

        Sanctum::actingAs($admin);
        $this->getJson("/api/admin/mosques/{$mosque->id}/lost-found")->assertOk()->assertJsonCount(2, 'data');
        $this->getJson("/api/admin/mosques/{$other->id}/lost-found")->assertForbidden();
    }

    public function test_items_open_for_more_than_30_days_are_closed_by_the_scheduled_command(): void
    {
        $stale = LostFoundItem::factory()->create();
        $stale->forceFill(['created_at' => now()->subDays(31)])->save();
        $fresh = LostFoundItem::factory()->create();

        $this->artisan('lost-found:close-stale')->assertSuccessful();

        $this->assertSame('closed', $stale->refresh()->status);
        $this->assertSame('open', $fresh->refresh()->status);
    }

    public function test_lost_found_items_can_be_reported(): void
    {
        $this->assertContains('lost_found', ContentReport::TYPES);
        $item = LostFoundItem::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/reports', [
            'reportable_type' => 'lost_found',
            'reportable_id' => $item->id,
            'category' => 'spam',
            'reason' => 'Fake post',
        ])->assertCreated();
    }

    // ---- Complaints ---------------------------------------------------

    public function test_user_can_send_feedback_and_see_it_in_my_complaints(): void
    {
        $mosque = Mosque::factory()->create();
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/mosques/{$mosque->id}/complaints", [
            'category' => 'cleanliness',
            'subject' => 'Wudu area',
            'body' => 'The wudu area floor is very slippery.',
            'is_anonymous' => true,
        ])->assertCreated()->assertJsonPath('data.is_anonymous', true)->assertJsonPath('data.status', 'open');

        $this->getJson('/api/me/complaints')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.author.id', $user->id);
    }

    public function test_complaint_validation(): void
    {
        $mosque = Mosque::factory()->create();
        $this->postJson("/api/mosques/{$mosque->id}/complaints", [])->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create());
        $this->postJson("/api/mosques/{$mosque->id}/complaints", ['category' => 'bogus', 'subject' => '', 'body' => 'short'])
            ->assertUnprocessable()->assertJsonValidationErrors(['category', 'subject', 'body']);
    }

    public function test_mosque_admin_sees_complaints_but_not_the_name_on_anonymous_ones(): void
    {
        $mosque = Mosque::factory()->create();
        $admin = $this->adminOf($mosque);
        $anonymous = Complaint::factory()->create(['mosque_id' => $mosque->id, 'is_anonymous' => true]);
        $named = Complaint::factory()->create(['mosque_id' => $mosque->id, 'is_anonymous' => false, 'status' => 'resolved']);

        Sanctum::actingAs($admin);
        $response = $this->getJson("/api/admin/mosques/{$mosque->id}/complaints")->assertOk()->assertJsonCount(2, 'data');
        $byId = collect($response->json('data'))->keyBy('id');
        $this->assertNull($byId[$anonymous->id]['author']);
        $this->assertSame($named->user_id, $byId[$named->id]['author']['id']);

        $this->getJson("/api/admin/mosques/{$mosque->id}/complaints?status=active")->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_super_admin_sees_the_author_of_anonymous_complaints(): void
    {
        $mosque = Mosque::factory()->create();
        $complaint = Complaint::factory()->create(['mosque_id' => $mosque->id, 'is_anonymous' => true]);

        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]));
        $this->getJson("/api/admin/mosques/{$mosque->id}/complaints")
            ->assertOk()->assertJsonPath('data.0.author.id', $complaint->user_id);
    }

    public function test_complaints_are_private_to_the_author_the_mosque_admin_and_super_admin(): void
    {
        $mosque = Mosque::factory()->create();
        $this->adminOf($mosque);
        $otherMosque = Mosque::factory()->create();
        $otherAdmin = $this->adminOf($otherMosque);
        $complaint = Complaint::factory()->create(['mosque_id' => $mosque->id]);

        // Another mosque's admin: no inbox, no reply, and no reaching it through their own mosque.
        Sanctum::actingAs($otherAdmin);
        $this->getJson("/api/admin/mosques/{$mosque->id}/complaints")->assertForbidden();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/complaints/{$complaint->id}", ['status' => 'resolved'])->assertForbidden();
        $this->patchJson("/api/admin/mosques/{$otherMosque->id}/complaints/{$complaint->id}", ['status' => 'resolved'])->assertNotFound();

        // Another normal user: no admin routes and the complaint is not in their list.
        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/admin/mosques/{$mosque->id}/complaints")->assertForbidden();
        $this->getJson('/api/me/complaints')->assertOk()->assertJsonCount(0, 'data');

        // A team member whose role does not cover the mosque's settings.
        $editor = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque->members()->create(['user_id' => $editor->id, 'role' => 'editor', 'accepted_at' => now()]);
        Sanctum::actingAs($editor);
        $this->getJson("/api/admin/mosques/{$mosque->id}/complaints")->assertForbidden();

        $this->assertSame('open', $complaint->refresh()->status);
    }

    public function test_admin_reply_updates_the_complaint_and_notifies_the_author(): void
    {
        $mosque = Mosque::factory()->create();
        $admin = $this->adminOf($mosque);
        $complaint = Complaint::factory()->create(['mosque_id' => $mosque->id]);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/mosques/{$mosque->id}/complaints/{$complaint->id}", [
            'status' => 'resolved',
            'admin_response' => 'Thank you, we have added anti-slip mats.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'resolved')
            ->assertJsonPath('data.admin_response', 'Thank you, we have added anti-slip mats.');

        $this->assertNotNull($complaint->refresh()->responded_at);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $complaint->user_id,
            'type' => Notification::TYPE_COMPLAINT,
            'reference_id' => $complaint->id,
        ]);

        // Changing only the status does not notify again.
        $this->patchJson("/api/admin/mosques/{$mosque->id}/complaints/{$complaint->id}", ['status' => 'in_progress'])->assertOk();
        $this->assertSame(1, Notification::query()->where('user_id', $complaint->user_id)->count());

        Sanctum::actingAs($complaint->user);
        $this->getJson('/api/me/complaints')->assertOk()
            ->assertJsonPath('data.0.admin_response', 'Thank you, we have added anti-slip mats.');
    }

    public function test_dashboard_shows_the_open_complaints_count(): void
    {
        $mosque = Mosque::factory()->create();
        $admin = $this->adminOf($mosque);
        Complaint::factory()->count(2)->create(['mosque_id' => $mosque->id]);
        Complaint::factory()->create(['mosque_id' => $mosque->id, 'status' => 'in_progress']);
        Complaint::factory()->create(['mosque_id' => $mosque->id, 'status' => 'resolved']);

        Sanctum::actingAs($admin);
        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()->assertJsonPath('data.summary.open_complaints_count', 3);
    }
}
