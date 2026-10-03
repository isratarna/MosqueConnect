<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\GoodsDonation;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use App\Policies\GoodsDonationPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GoodsDonationTest extends TestCase
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

    private function pledge(array $overrides = []): array
    {
        return [
            'item_name' => 'Prayer mats',
            'quantity' => '10 pieces',
            'condition' => 'new',
            'delivery_method' => 'drop_off',
            'preferred_date' => today()->addDays(2)->toDateString(),
            'contact' => '01711111111',
            'notes' => 'Can bring after Jumuah.',
            ...$overrides,
        ];
    }

    public function test_user_can_pledge_goods_and_the_mosque_admin_is_notified(): void
    {
        $mosque = Mosque::factory()->create();
        $admin = $this->adminOf($mosque);
        $donor = User::factory()->create();
        Sanctum::actingAs($donor);

        $id = $this->postJson("/api/mosques/{$mosque->id}/goods-donations", $this->pledge())
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.item_name', 'Prayer mats')
            ->json('data.id');

        $this->assertDatabaseHas('goods_donations', ['id' => $id, 'user_id' => $donor->id, 'mosque_id' => $mosque->id]);
        $this->assertDatabaseHas('notifications', ['user_id' => $admin->id, 'type' => Notification::TYPE_GOODS_DONATION, 'reference_id' => $id]);

        $this->getJson('/api/me/goods-donations')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $id);
    }

    public function test_pledge_validation_and_auth(): void
    {
        $mosque = Mosque::factory()->create();
        $this->postJson("/api/mosques/{$mosque->id}/goods-donations", $this->pledge())->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create());
        $this->postJson("/api/mosques/{$mosque->id}/goods-donations", $this->pledge([
            'condition' => 'broken', 'delivery_method' => 'teleport', 'item_name' => '', 'quantity' => str_repeat('9', 51),
            'preferred_date' => today()->subDay()->toDateString(),
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['condition', 'delivery_method', 'item_name', 'quantity', 'preferred_date']);
    }

    public function test_a_pledge_may_answer_only_this_mosques_announcement(): void
    {
        $mosque = Mosque::factory()->create();
        $own = Announcement::factory()->create(['mosque_id' => $mosque->id]);
        $foreign = Announcement::factory()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/mosques/{$mosque->id}/goods-donations", $this->pledge(['announcement_id' => $foreign->id]))
            ->assertUnprocessable()->assertJsonValidationErrors('announcement_id');
        $this->postJson("/api/mosques/{$mosque->id}/goods-donations", $this->pledge(['announcement_id' => $own->id]))
            ->assertCreated()->assertJsonPath('data.announcement_id', $own->id);
    }

    public function test_admin_lists_and_filters_their_mosques_pledges(): void
    {
        $mosque = Mosque::factory()->create();
        $admin = $this->adminOf($mosque);
        GoodsDonation::factory()->count(2)->create(['mosque_id' => $mosque->id]);
        GoodsDonation::factory()->create(['mosque_id' => $mosque->id, 'status' => 'received']);
        GoodsDonation::factory()->create();

        Sanctum::actingAs($admin);
        $this->getJson("/api/admin/mosques/{$mosque->id}/goods-donations")->assertOk()->assertJsonCount(3, 'data');
        $this->getJson("/api/admin/mosques/{$mosque->id}/goods-donations?status=pending")->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_admin_accepts_then_receives_a_pledge_and_the_donor_is_notified_each_time(): void
    {
        $mosque = Mosque::factory()->create();
        $admin = $this->adminOf($mosque);
        $donation = GoodsDonation::factory()->create(['mosque_id' => $mosque->id]);

        Sanctum::actingAs($admin);
        $url = "/api/admin/mosques/{$mosque->id}/goods-donations/{$donation->id}";
        $this->patchJson($url, ['status' => 'accepted'])->assertOk()->assertJsonPath('data.status', 'accepted')->assertJsonPath('data.handled_by', $admin->id);
        $this->patchJson($url, ['status' => 'received'])->assertOk()->assertJsonPath('data.status', 'received');
        $this->patchJson($url, ['status' => 'declined'])->assertUnprocessable();
        $this->patchJson($url, ['status' => 'pending'])->assertUnprocessable();

        $this->assertSame(2, Notification::query()->where('user_id', $donation->user_id)->where('type', Notification::TYPE_GOODS_DONATION)->count());
    }

    public function test_admin_can_decline_a_pending_pledge(): void
    {
        $mosque = Mosque::factory()->create();
        $admin = $this->adminOf($mosque);
        $donation = GoodsDonation::factory()->create(['mosque_id' => $mosque->id]);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/mosques/{$mosque->id}/goods-donations/{$donation->id}", ['status' => 'declined'])
            ->assertOk()->assertJsonPath('data.status', 'declined');
    }

    public function test_other_mosques_admins_and_normal_users_cannot_manage_pledges(): void
    {
        $mosque = Mosque::factory()->create();
        $this->adminOf($mosque);
        $otherMosque = Mosque::factory()->create();
        $otherAdmin = $this->adminOf($otherMosque);
        $donation = GoodsDonation::factory()->create(['mosque_id' => $mosque->id]);

        Sanctum::actingAs($otherAdmin);
        $this->getJson("/api/admin/mosques/{$mosque->id}/goods-donations")->assertForbidden();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/goods-donations/{$donation->id}", ['status' => 'accepted'])->assertForbidden();
        // Scoped binding: a pledge cannot be reached through another mosque's URL.
        $this->patchJson("/api/admin/mosques/{$otherMosque->id}/goods-donations/{$donation->id}", ['status' => 'accepted'])->assertNotFound();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/admin/mosques/{$mosque->id}/goods-donations")->assertForbidden();

        $this->assertSame('pending', $donation->refresh()->status);
    }

    public function test_super_admin_can_manage_any_pledge(): void
    {
        $donation = GoodsDonation::factory()->create();
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]));

        $this->patchJson("/api/admin/mosques/{$donation->mosque_id}/goods-donations/{$donation->id}", ['status' => 'accepted'])->assertOk();
    }

    public function test_policy_allows_only_the_mosques_own_admin_or_super_admin(): void
    {
        $mosque = Mosque::factory()->create();
        $admin = $this->adminOf($mosque);
        $otherAdmin = $this->adminOf(Mosque::factory()->create());
        $donation = GoodsDonation::factory()->create(['mosque_id' => $mosque->id]);
        $policy = new GoodsDonationPolicy;

        $this->assertTrue($policy->update($admin, $donation)->allowed());
        $this->assertTrue($policy->viewAny($admin, $mosque)->allowed());
        $this->assertFalse($policy->update($otherAdmin, $donation)->allowed());
        $this->assertFalse($policy->update(User::factory()->create(), $donation)->allowed());
        $this->assertTrue($policy->update(User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]), $donation)->allowed());
    }

    public function test_dashboard_shows_the_pending_goods_donations_count(): void
    {
        $mosque = Mosque::factory()->create();
        $admin = $this->adminOf($mosque);
        GoodsDonation::factory()->count(2)->create(['mosque_id' => $mosque->id]);
        GoodsDonation::factory()->create(['mosque_id' => $mosque->id, 'status' => 'accepted']);

        Sanctum::actingAs($admin);
        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()->assertJsonPath('data.summary.pending_goods_donations_count', 2);
    }
}
