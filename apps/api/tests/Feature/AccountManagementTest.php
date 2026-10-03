<?php

namespace Tests\Feature;

use App\Models\BloodRequest;
use App\Models\BloodRequestResponse;
use App\Models\CampaignDonation;
use App\Models\Follower;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\PhoneOtpVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_deletion_requires_otp_and_anonymizes_account_data(): void
    {
        $user = User::factory()->create(['phone' => '+15555550120', 'email' => 'member@example.test']);
        $mosque = Mosque::factory()->create();
        Follower::factory()->create(['user_id' => $user->id, 'mosque_id' => $mosque->id]);
        Notification::factory()->create(['user_id' => $user->id, 'mosque_id' => $mosque->id]);
        $donation = CampaignDonation::factory()->create([
            'user_id' => $user->id,
            'donor_name' => 'Member Name',
            'contact' => 'Member Contact',
        ]);
        $bloodRequest = BloodRequest::factory()->create([
            'created_by' => $user->id,
            'contact_name' => 'Member Name',
            'contact_phone' => '+15555550120',
        ]);
        $response = BloodRequestResponse::factory()->create([
            'user_id' => $user->id,
            'message' => 'I can donate.',
        ]);
        $user->notificationPreferences()->create();
        $user->createToken('device-one');
        Sanctum::actingAs($user);
        $this->createOtp($user->phone);

        $this->deleteJson('/api/auth/me', ['otp' => '123456'])
            ->assertOk()
            ->assertJsonPath('message', 'Account deleted successfully.');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Deleted user',
            'email' => null,
        ]);
        $this->assertDatabaseMissing('users', ['id' => $user->id, 'phone' => '+15555550120']);
        $this->assertDatabaseMissing('followers', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('notifications', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('notification_preferences', ['user_id' => $user->id]);
        $this->assertDatabaseHas('campaign_donations', [
            'id' => $donation->id,
            'user_id' => null,
            'donor_name' => null,
            'contact' => null,
        ]);
        $this->assertDatabaseHas('blood_requests', [
            'id' => $bloodRequest->id,
            'created_by' => null,
            'contact_name' => null,
            'contact_phone' => null,
        ]);
        $this->assertDatabaseHas('blood_request_responses', [
            'id' => $response->id,
            'user_id' => null,
            'message' => null,
        ]);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'account.deleted', 'actor_id' => $user->id]);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_account_deletion_requires_valid_otp(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->deleteJson('/api/auth/me', ['otp' => '123456'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('otp');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => $user->name]);
    }

    public function test_mosque_owners_and_super_admins_cannot_delete_their_accounts(): void
    {
        $owner = User::factory()->create();
        Mosque::factory()->create(['owner_id' => $owner->id]);
        Sanctum::actingAs($owner);
        $this->deleteJson('/api/auth/me', ['otp' => '123456'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('account');

        $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        Sanctum::actingAs($superAdmin);
        $this->deleteJson('/api/auth/me', ['otp' => '123456'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('account');
    }

    public function test_data_export_is_a_private_json_download_with_recent_user_data(): void
    {
        $user = User::factory()->create();
        $mosque = Mosque::factory()->create();
        Follower::factory()->create(['user_id' => $user->id, 'mosque_id' => $mosque->id]);
        Notification::factory()->create(['user_id' => $user->id, 'created_at' => now()]);
        Notification::factory()->create(['user_id' => $user->id, 'created_at' => now()->subMonths(7)]);
        Sanctum::actingAs($user);

        $this->getJson('/api/auth/me/export')
            ->assertOk()
            ->assertHeader('Content-Disposition', 'attachment; filename="mosqueconnect-data.json"')
            ->assertHeader('Cache-Control', 'private, no-store')
            ->assertJsonPath('profile.id', $user->id)
            ->assertJsonCount(1, 'follows')
            ->assertJsonCount(1, 'notifications');
    }

    public function test_logout_all_revokes_every_access_token(): void
    {
        $user = User::factory()->create();
        $user->createToken('device-one');
        $user->createToken('device-two');
        Sanctum::actingAs($user);

        $this->postJson('/api/auth/logout-all')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_phone_change_requires_a_verified_unused_number_and_revokes_other_tokens(): void
    {
        $user = User::factory()->create(['phone' => '+15555550121']);
        $other = User::factory()->create(['phone' => '+15555550122']);
        $currentToken = $user->createToken('current-device');
        $otherToken = $user->createToken('other-device');
        $this->createOtp('+15555550123');

        $this->postJson('/api/auth/me/phone/verify', [
            'phone' => $other->phone,
            'otp' => '123456',
        ], ['Authorization' => 'Bearer '.$currentToken->plainTextToken])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('phone');

        $this->postJson('/api/auth/me/phone/verify', [
            'phone' => '+15555550123',
            'otp' => '123456',
        ], ['Authorization' => 'Bearer '.$currentToken->plainTextToken])
            ->assertOk()
            ->assertJsonPath('message', 'Phone number updated.');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'phone' => '+15555550123']);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $currentToken->accessToken->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $otherToken->accessToken->id]);
    }

    private function createOtp(string $phone): void
    {
        PhoneOtpVerification::create([
            'phone' => $phone,
            'otp_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(5),
        ]);
    }
}