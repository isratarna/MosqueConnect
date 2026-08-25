<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\PhoneOtpVerification;
use App\Models\User;
use App\Services\Otp\SmsOtpSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PhoneOtpAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private FakeSmsOtpSender $sender;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sender = new FakeSmsOtpSender;
        $this->app->instance(SmsOtpSender::class, $this->sender);
    }

    public function test_send_otp_requires_a_valid_phone_number(): void
    {
        $this->postJson('/api/auth/send-otp', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone']);

        $this->postJson('/api/auth/send-otp', ['phone' => '555-1000'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_send_otp_generates_stores_and_sends_otp(): void
    {
        $this->postJson('/api/auth/send-otp', ['phone' => '+15555550100'])
            ->assertOk()
            ->assertJson(['message' => 'OTP sent successfully.']);

        $verification = PhoneOtpVerification::first();

        $this->assertNotNull($verification);
        $this->assertSame('+15555550100', $verification->phone);
        $this->assertNotNull($verification->expires_at);
        $this->assertFalse($verification->isConsumed());
        $this->assertCount(1, $this->sender->sent);
        $this->assertSame('+15555550100', $this->sender->sent[0]['phone']);
        $this->assertMatchesRegularExpression('/^\d{6}$/', $this->sender->sent[0]['otp']);
        $this->assertNotSame($this->sender->sent[0]['otp'], $verification->otp_hash);
    }

    public function test_send_otp_is_throttled(): void
    {
        config(['otp.throttle.send_per_minute' => 2]);

        $payload = ['phone' => '+15555550101'];

        $this->postJson('/api/auth/send-otp', $payload)->assertOk();
        $this->postJson('/api/auth/send-otp', $payload)->assertOk();
        $this->postJson('/api/auth/send-otp', $payload)->assertStatus(429);
    }

    public function test_expired_otp_is_rejected(): void
    {
        PhoneOtpVerification::create([
            'phone' => '+15555550100',
            'otp_hash' => Hash::make('123456'),
            'expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/api/auth/verify-otp', [
            'phone' => '+15555550100',
            'otp' => '123456',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['otp']);
    }

    public function test_invalid_otp_is_rejected(): void
    {
        $this->createOtp('+15555550100', '123456');

        $this->postJson('/api/auth/verify-otp', [
            'phone' => '+15555550100',
            'otp' => '654321',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['otp']);
    }

    public function test_verify_otp_is_throttled(): void
    {
        config(['otp.throttle.verify_per_minute' => 2]);

        $payload = [
            'phone' => '+15555550102',
            'otp' => '123456',
        ];

        $this->postJson('/api/auth/verify-otp', $payload)->assertUnprocessable();
        $this->postJson('/api/auth/verify-otp', $payload)->assertUnprocessable();
        $this->postJson('/api/auth/verify-otp', $payload)->assertStatus(429);
    }

    public function test_consumed_otp_is_rejected(): void
    {
        $this->createOtp('+15555550100', '123456', consumed: true);

        $this->postJson('/api/auth/verify-otp', [
            'phone' => '+15555550100',
            'otp' => '123456',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['otp']);
    }

    public function test_valid_otp_creates_new_normal_user_and_returns_token(): void
    {
        $this->createOtp('+15555550100', '123456');

        $this->postJson('/api/auth/verify-otp', [
            'phone' => '+15555550100',
            'otp' => '123456',
            'role' => User::ROLE_SUPER_ADMIN,
        ])->assertOk()
            ->assertJsonPath('user.phone', '+15555550100')
            ->assertJsonPath('user.role', User::ROLE_NORMAL_USER)
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonStructure(['token']);

        $this->assertDatabaseHas('users', [
            'phone' => '+15555550100',
            'role' => User::ROLE_NORMAL_USER,
        ]);
    }

    public function test_valid_otp_logs_in_existing_user_and_preserves_role(): void
    {
        $user = User::factory()->create([
            'phone' => '+15555550100',
            'role' => User::ROLE_MOSQUE_ADMIN,
        ]);
        $this->createOtp($user->phone, '123456');

        $this->postJson('/api/auth/verify-otp', [
            'phone' => $user->phone,
            'otp' => '123456',
        ])->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.role', User::ROLE_MOSQUE_ADMIN)
            ->assertJsonStructure(['token']);

        $this->assertSame(1, User::where('phone', $user->phone)->count());
    }

    public function test_otp_cannot_be_reused_to_create_duplicate_users(): void
    {
        $this->createOtp('+15555550100', '123456');

        $payload = [
            'phone' => '+15555550100',
            'otp' => '123456',
        ];

        $this->postJson('/api/auth/verify-otp', $payload)->assertOk();
        $this->postJson('/api/auth/verify-otp', $payload)->assertUnprocessable();

        $this->assertSame(1, User::where('phone', '+15555550100')->count());
    }

    public function test_authenticated_me_returns_current_user(): void
    {
        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_rejected_mosque_admin_receives_rejected_account_status(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $user->id,
            'verification_status' => Mosque::VERIFICATION_REJECTED,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.status', 'rejected')
            ->assertJsonPath('user.managed_mosques.0.id', $mosque->id)
            ->assertJsonPath('user.managed_mosques.0.verification_status', Mosque::VERIFICATION_REJECTED);
    }

    public function test_unauthenticated_me_is_rejected(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_authenticated_logout_revokes_current_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('phone-otp');

        $this->postJson('/api/auth/logout', [], [
            'Authorization' => 'Bearer '.$token->plainTextToken,
        ])->assertOk()
            ->assertJson(['message' => 'Logged out successfully.']);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'id' => $token->accessToken->id,
        ]);
    }

    public function test_unauthenticated_logout_is_rejected(): void
    {
        $this->postJson('/api/auth/logout')->assertUnauthorized();
    }

    private function createOtp(string $phone, string $otp, bool $consumed = false): PhoneOtpVerification
    {
        return PhoneOtpVerification::create([
            'phone' => $phone,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(5),
            'consumed_at' => $consumed ? now() : null,
        ]);
    }
}

class FakeSmsOtpSender implements SmsOtpSender
{
    /**
     * @var list<array{phone: string, otp: string}>
     */
    public array $sent = [];

    public function send(string $phone, string $otp): void
    {
        $this->sent[] = [
            'phone' => $phone,
            'otp' => $otp,
        ];
    }
}
