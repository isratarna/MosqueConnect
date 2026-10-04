<?php

namespace Tests\Feature;

use App\Jobs\NotifyCampaignSupporters;
use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\CampaignUpdate;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CampaignTransparencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_methods_are_managed_by_mosque_admins_and_only_active_methods_are_public(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $campaign = Campaign::factory()->active()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'reference_hint' => 'Use RAMADAN and your phone number.',
        ]);
        Sanctum::actingAs($admin);

        $methodId = $this->postJson("/api/admin/mosques/{$mosque->id}/payment-methods", [
            'type' => 'bkash',
            'account_name' => 'Mosque Committee',
            'account_number' => '01700000000',
            'instructions' => 'Choose Send Money.',
            'sort_order' => 1,
        ])->assertCreated()->json('data.id');

        $this->patchJson("/api/admin/mosques/{$mosque->id}/payment-methods/{$methodId}", [
            'is_active' => false,
        ])->assertOk()->assertJsonPath('data.is_active', false);

        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data.payment_methods');

        $this->patchJson("/api/admin/mosques/{$mosque->id}/payment-methods/{$methodId}", [
            'is_active' => true,
        ])->assertOk();

        $this->getJson("/api/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('data.payment_methods.0.account_number', '01700000000');
        $this->getJson("/api/campaigns/{$campaign->id}")
            ->assertOk()
            ->assertJsonPath('data.reference_hint', 'Use RAMADAN and your phone number.')
            ->assertJsonPath('data.payment_methods.0.type', 'bkash');

        $this->deleteJson("/api/admin/mosques/{$mosque->id}/payment-methods/{$methodId}")->assertOk();
        $this->assertDatabaseMissing('mosque_payment_methods', ['id' => $methodId]);
    }

    public function test_public_supporters_are_confirmed_paginated_and_anonymous_when_requested(): void
    {
        $campaign = Campaign::factory()->active()->create();
        CampaignDonation::factory()->create([
            'campaign_id' => $campaign->id,
            'status' => CampaignDonation::STATUS_CONFIRMED,
            'donor_name' => 'Amina',
            'contact' => 'private-contact',
            'message' => 'For the new roof.',
            'is_anonymous' => false,
            'created_at' => now()->subDay(),
        ]);
        CampaignDonation::factory()->create([
            'campaign_id' => $campaign->id,
            'status' => CampaignDonation::STATUS_CONFIRMED,
            'donor_name' => 'Private Donor',
            'contact' => 'private-contact-2',
            'is_anonymous' => true,
            'created_at' => now(),
        ]);
        CampaignDonation::factory()->create([
            'campaign_id' => $campaign->id,
            'status' => CampaignDonation::STATUS_PENDING,
        ]);

        $this->getJson("/api/campaigns/{$campaign->id}/supporters?per_page=1")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Anonymous')
            ->assertJsonPath('meta.total', 2)
            ->assertJsonMissingPath('data.0.contact');

        $this->getJson("/api/campaigns/{$campaign->id}/supporters?per_page=1&page=2")
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Amina')
            ->assertJsonPath('data.0.message', 'For the new roof.')
            ->assertJsonMissingPath('data.0.user_id');
    }

    public function test_public_campaign_sorts_rank_funding_and_progress(): void
    {
        $funded = Campaign::factory()->active()->create([
            'raised_amount' => 1200,
            'target_amount' => 10000,
            'created_at' => now()->subDay(),
        ]);
        $almostThere = Campaign::factory()->active()->create([
            'raised_amount' => 950,
            'target_amount' => 1000,
            'created_at' => now(),
        ]);

        $this->getJson('/api/campaigns?sort=most_funded')
            ->assertOk()
            ->assertJsonPath('data.0.id', $funded->id);
        $this->getJson('/api/campaigns?sort=almost_there')
            ->assertOk()
            ->assertJsonPath('data.0.id', $almostThere->id);
        $this->getJson('/api/campaigns?sort=newest')
            ->assertOk()
            ->assertJsonPath('data.0.id', $almostThere->id);
    }

    public function test_admin_can_post_edit_and_delete_updates_and_notify_confirmed_donors(): void
    {
        Storage::fake('public');
        Queue::fake();
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $campaign = Campaign::factory()->active()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
        ]);
        $supporter = User::factory()->create();
        CampaignDonation::factory()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $supporter->id,
            'status' => CampaignDonation::STATUS_CONFIRMED,
        ]);
        $optedOut = User::factory()->create();
        CampaignDonation::factory()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $optedOut->id,
            'status' => CampaignDonation::STATUS_CONFIRMED,
        ]);
        $optedOut->notificationPreferences()->create(['campaign' => false]);
        CampaignDonation::factory()->create([
            'campaign_id' => $campaign->id,
            'status' => CampaignDonation::STATUS_PENDING,
        ]);
        Sanctum::actingAs($admin);

        $updateId = $this->postJson("/api/admin/mosques/{$mosque->id}/campaigns/{$campaign->id}/updates", [
            'title' => 'Roof materials purchased',
            'body' => 'The first delivery arrived today.',
            'amount_spent' => 12500,
            'image' => UploadedFile::fake()->image('receipt.jpg'),
        ])->assertCreated()
            ->assertJsonPath('data.amount_spent', 12500)
            ->json('data.id');
        $imagePath = CampaignUpdate::query()->findOrFail($updateId)->image_path;
        Storage::disk('public')->assertExists($imagePath);

        Queue::assertPushed(NotifyCampaignSupporters::class, fn (NotifyCampaignSupporters $job): bool =>
            $job->campaignUpdateId === $updateId);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/campaigns/{$campaign->id}/updates/{$updateId}", [
            'title' => 'Updated roof report',
        ])->assertOk()->assertJsonPath('data.title', 'Updated roof report');

        $this->getJson("/api/campaigns/{$campaign->id}")
            ->assertOk()
            ->assertJsonPath('data.updates.0.title', 'Updated roof report');
        $this->getJson("/api/campaigns/{$campaign->id}/updates")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $job = new NotifyCampaignSupporters($updateId);
        $job->handle(app(NotificationService::class));
        $this->assertDatabaseHas('notifications', [
            'user_id' => $supporter->id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_CAMPAIGN,
            'reference_type' => Notification::REFERENCE_CAMPAIGN_UPDATE,
            'reference_id' => $updateId,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $optedOut->id,
            'reference_type' => Notification::REFERENCE_CAMPAIGN_UPDATE,
            'reference_id' => $updateId,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'reference_type' => Notification::REFERENCE_CAMPAIGN_UPDATE,
            'user_id' => CampaignDonation::query()->where('campaign_id', $campaign->id)->where('status', CampaignDonation::STATUS_PENDING)->value('user_id'),
        ]);

        $this->deleteJson("/api/admin/mosques/{$mosque->id}/campaigns/{$campaign->id}/updates/{$updateId}")->assertOk();
        $this->assertDatabaseMissing('campaign_updates', ['id' => $updateId]);
    }

    public function test_receipt_download_requires_ownership_and_confirmation(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->create();
        $confirmed = CampaignDonation::factory()->create([
            'user_id' => $user->id,
            'confirmed_by' => $admin->id,
            'status' => CampaignDonation::STATUS_CONFIRMED,
            'confirmed_at' => now(),
            'reference' => 'RAMADAN-42',
        ]);
        $pending = CampaignDonation::factory()->create([
            'user_id' => $user->id,
            'status' => CampaignDonation::STATUS_PENDING,
        ]);
        Sanctum::actingAs($user);

        $receipt = $this->get("/api/me/donations/{$confirmed->id}/receipt")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $receipt->getContent());
        $this->getJson("/api/me/donations/{$pending->id}/receipt")->assertNotFound();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/me/donations/{$confirmed->id}/receipt")->assertNotFound();
    }

    public function test_mosque_admin_can_download_campaign_donation_csv(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $campaign = Campaign::factory()->active()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
        ]);
        CampaignDonation::factory()->create([
            'campaign_id' => $campaign->id,
            'donor_name' => 'CSV Donor',
            'status' => CampaignDonation::STATUS_CONFIRMED,
        ]);
        Sanctum::actingAs($admin);

        $response = $this->get("/api/admin/mosques/{$mosque->id}/campaigns/{$campaign->id}/donations/export")
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('CSV Donor', $content);
        $this->assertStringContainsString('payment_method', $content);
    }

    private function verifiedAdminAndMosque(): array
    {
        $admin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $admin->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);

        return [$admin, $mosque];
    }
}