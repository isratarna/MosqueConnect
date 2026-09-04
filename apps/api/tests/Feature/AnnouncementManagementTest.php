<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnnouncementManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_announcements_for_a_mosque_only_return_published_items(): void
    {
        $mosque = Mosque::factory()->create();

        $published = Announcement::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'title' => 'Prayer room update',
            'moderation_status' => Announcement::MODERATION_APPROVED,
        ]);

        Announcement::factory()->create([
            'mosque_id' => $mosque->id,
            'status' => Announcement::STATUS_DRAFT,
            'moderation_status' => Announcement::MODERATION_APPROVED,
        ]);

        Announcement::factory()->published()->create([
            'mosque_id' => $mosque->id,
            'moderation_status' => Announcement::MODERATION_PENDING,
        ]);

        $this->getJson("/api/mosques/{$mosque->id}/announcements")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $published->id)
            ->assertJsonPath('data.0.title', 'Prayer room update');
    }

    public function test_verified_mosque_admin_can_manage_announcements_for_their_mosque(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Ramadan timings',
            'body' => 'Iftar will be served at sunset.',
            'urgency' => Announcement::URGENCY_HIGH,
            'status' => Announcement::STATUS_PUBLISHED,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Ramadan timings')
            ->assertJsonPath('data.creator.id', $admin->id)
            ->assertJsonPath('data.status', Announcement::STATUS_PUBLISHED);

        $announcementId = $response->json('data.id');

        $this->getJson("/api/admin/mosques/{$mosque->id}/announcements")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->patchJson("/api/admin/mosques/{$mosque->id}/announcements/{$announcementId}", [
            'title' => 'Updated Ramadan timings',
            'status' => Announcement::STATUS_DRAFT,
        ])->assertOk()
            ->assertJsonPath('data.title', 'Updated Ramadan timings')
            ->assertJsonPath('data.status', Announcement::STATUS_DRAFT);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/announcements/{$announcementId}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', Announcement::STATUS_PUBLISHED);

        $this->deleteJson("/api/admin/mosques/{$mosque->id}/announcements/{$announcementId}")
            ->assertOk();
    }

    public function test_announcements_from_other_mosques_are_restricted_to_their_owner(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $owner = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $owner->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $otherMosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        Sanctum::actingAs($admin);

        $announcement = Announcement::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $owner->id,
        ]);

        $this->getJson("/api/admin/mosques/{$otherMosque->id}/announcements/{$announcement->id}")
            ->assertNotFound();

        $this->patchJson("/api/admin/mosques/{$otherMosque->id}/announcements/{$announcement->id}", [
            'title' => 'Unauthorized edit',
        ])->assertNotFound();
    }
}
