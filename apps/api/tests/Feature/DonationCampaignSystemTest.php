<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\CampaignDonation;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DonationCampaignSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_list_and_details_only_expose_current_active_campaigns(): void
    {
        $active = Campaign::factory()->active()->create(['raised_amount' => 2500, 'target_amount' => 10000]);
        Campaign::factory()->create(['status' => Campaign::STATUS_DRAFT]);
        Campaign::factory()->active()->create(['starts_on' => today()->addDay(), 'ends_on' => today()->addMonth()]);
        Campaign::factory()->active()->create(['starts_on' => today()->subMonth(), 'ends_on' => today()->subDay()]);

        $this->getJson('/api/campaigns')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $active->id)
            ->assertJsonPath('data.0.progress_percentage', 25)
            ->assertJsonPath('data.0.remaining_amount', 7500)
            ->assertJsonPath('data.0.accepts_donations', true);

        $this->getJson("/api/campaigns/{$active->id}")
            ->assertOk()
            ->assertJsonPath('data.mosque.id', $active->mosque_id);
    }

    public function test_verified_owner_can_create_campaign_and_cannot_spoof_ownership_or_raised_amount(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/mosques/{$mosque->id}/campaigns", $this->validPayload([
            'mosque_id' => Mosque::factory()->create()->id,
            'created_by' => User::factory()->create()->id,
            'raised_amount' => 500000,
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['mosque_id', 'created_by', 'raised_amount']);

        $response = $this->postJson("/api/admin/mosques/{$mosque->id}/campaigns", $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('data.mosque_id', $mosque->id)
            ->assertJsonPath('data.created_by', $admin->id)
            ->assertJsonPath('data.raised_amount', 0);

        $this->assertDatabaseHas('campaigns', [
            'id' => $response->json('data.id'),
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'raised_amount' => 0,
        ]);
    }

    public function test_unverified_or_non_owning_mosque_admin_cannot_manage_campaigns(): void
    {
        [$owner, $mosque] = $this->verifiedAdminAndMosque();
        $campaign = Campaign::factory()->create(['mosque_id' => $mosque->id, 'created_by' => $owner->id]);
        $otherAdmin = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        Sanctum::actingAs($otherAdmin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/campaigns/{$campaign->id}", ['title' => 'Unauthorized'])
            ->assertForbidden();

        $unverifiedMosque = Mosque::factory()->create([
            'owner_id' => $otherAdmin->id,
            'verification_status' => Mosque::VERIFICATION_PENDING,
        ]);
        $this->postJson("/api/admin/mosques/{$unverifiedMosque->id}/campaigns", $this->validPayload())
            ->assertForbidden();
    }

    public function test_campaign_lifecycle_is_enforced_and_activation_notifies_followers_once(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $follower = Follower::factory()->create(['mosque_id' => $mosque->id]);
        $campaign = Campaign::factory()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'title' => 'Community Clinic Fund',
        ]);
        Sanctum::actingAs($admin);

        $url = "/api/admin/mosques/{$mosque->id}/campaigns/{$campaign->id}";
        $this->patchJson("{$url}/complete")->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->patchJson("{$url}/activate")->assertOk()->assertJsonPath('data.status', Campaign::STATUS_ACTIVE);
        $this->patchJson("{$url}/activate")->assertOk();

        $this->assertSame(1, Notification::query()
            ->where('user_id', $follower->user_id)
            ->where('type', Notification::TYPE_CAMPAIGN)
            ->where('reference_id', $campaign->id)
            ->count());

        $this->patchJson("{$url}/complete")->assertOk()->assertJsonPath('data.status', Campaign::STATUS_COMPLETED);
        $this->patchJson("{$url}/cancel")->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_user_manual_support_is_pending_until_owner_confirms_it_exactly_once(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $campaign = Campaign::factory()->active()->create([
            'mosque_id' => $mosque->id,
            'created_by' => $admin->id,
            'raised_amount' => 100,
        ]);
        $supporter = User::factory()->create();
        Sanctum::actingAs($supporter);

        $response = $this->postJson("/api/campaigns/{$campaign->id}/donations", [
            'donor_name' => 'Community Member',
            'contact' => '+8801711000000',
            'amount' => 250.50,
            'payment_method' => CampaignDonation::METHOD_MOBILE_BANKING,
            'reference' => 'TXN-1001',
            'is_anonymous' => false,
        ])->assertCreated()
            ->assertJsonPath('data.status', CampaignDonation::STATUS_PENDING);

        $donationId = $response->json('data.id');
        $this->assertDatabaseHas('campaigns', ['id' => $campaign->id, 'raised_amount' => 100]);

        Sanctum::actingAs($admin);
        $confirmUrl = "/api/admin/mosques/{$mosque->id}/campaigns/{$campaign->id}/donations/{$donationId}/confirm";
        $this->patchJson($confirmUrl)->assertOk()->assertJsonPath('data.status', CampaignDonation::STATUS_CONFIRMED);
        $this->patchJson($confirmUrl)->assertOk();

        $this->assertEquals(350.50, (float) $campaign->refresh()->raised_amount);
        $this->assertDatabaseHas('campaign_donations', [
            'id' => $donationId,
            'confirmed_by' => $admin->id,
            'status' => CampaignDonation::STATUS_CONFIRMED,
        ]);
    }

    public function test_donation_routes_are_scoped_to_their_campaign_and_mosque(): void
    {
        [$admin, $mosque] = $this->verifiedAdminAndMosque();
        $campaign = Campaign::factory()->active()->create(['mosque_id' => $mosque->id, 'created_by' => $admin->id]);
        $otherCampaign = Campaign::factory()->active()->create();
        $donation = CampaignDonation::factory()->create(['campaign_id' => $otherCampaign->id]);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/mosques/{$mosque->id}/campaigns/{$campaign->id}/donations/{$donation->id}/confirm")
            ->assertNotFound();
    }

    public function test_anonymous_support_does_not_require_a_donor_name_but_requires_authentication(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $payload = [
            'contact' => '+8801711000000',
            'amount' => 50,
            'payment_method' => CampaignDonation::METHOD_CASH,
            'is_anonymous' => true,
        ];

        $this->postJson("/api/campaigns/{$campaign->id}/donations", $payload)->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create());
        $this->postJson("/api/campaigns/{$campaign->id}/donations", $payload)->assertCreated();
    }

    /** @param array<string, mixed> $overrides */
    private function validPayload(array $overrides = []): array
    {
        return [
            'title' => 'Repair the community roof',
            'summary' => 'Help restore a safe and weatherproof prayer space for the local community.',
            'description' => 'Funds will be used for roofing materials, labour, and drainage repairs.',
            'category' => Campaign::CATEGORY_MOSQUE_DEVELOPMENT,
            'target_amount' => 200000,
            'starts_on' => today()->toDateString(),
            'ends_on' => today()->addMonth()->toDateString(),
            'status' => Campaign::STATUS_DRAFT,
            ...$overrides,
        ];
    }

    /** @return array{User, Mosque} */
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
