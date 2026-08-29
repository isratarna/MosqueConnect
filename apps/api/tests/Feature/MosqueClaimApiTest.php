<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MosqueClaimApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_submit_a_claim(): void
    {
        $this->postJson('/api/mosque-claims', [])->assertUnauthorized();
    }

    public function test_authenticated_user_can_submit_a_claim(): void
    {
        Storage::fake('local');
        $user = $this->actingAsNormalUser();
        $mosque = Mosque::factory()->create(['owner_id' => null]);

        $response = $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
            'document' => UploadedFile::fake()->create('proof.pdf', 512, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I lead prayers at this mosque and manage its schedule.',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status_label', 'pending')
            ->assertJsonPath('data.status', VerificationRequest::STATUS_PENDING)
            ->assertJsonPath('data.mosque.id', $mosque->id);

        $this->assertDatabaseHas('verification_requests', [
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'status' => VerificationRequest::STATUS_PENDING,
            'role_at_mosque' => 'Imam',
        ]);

        Storage::disk('local')->assertExists($response->json('data.document_path'));
    }

    public function test_claim_submission_validates_mosque_exists(): void
    {
        Storage::fake('local');
        $this->actingAsNormalUser();

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => 999999,
            'document' => UploadedFile::fake()->create('proof.pdf', 512, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I manage this mosque.',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('mosque_id');
    }

    public function test_claim_submission_validates_required_info(): void
    {
        Storage::fake('local');
        $mosque = Mosque::factory()->create(['owner_id' => null]);
        $this->actingAsNormalUser();

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['document', 'role_at_mosque', 'verification_reason']);
    }

    public function test_same_user_cannot_submit_duplicate_pending_claim_for_same_mosque(): void
    {
        Storage::fake('local');
        $user = $this->actingAsNormalUser();
        $mosque = Mosque::factory()->create(['owner_id' => null]);
        VerificationRequest::factory()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'status' => VerificationRequest::STATUS_PENDING,
        ]);

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
            'document' => UploadedFile::fake()->create('proof.pdf', 512, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I manage this mosque.',
        ])->assertStatus(409)
            ->assertJsonPath('message', 'You already have a pending claim for this mosque.');
    }

    public function test_user_cannot_claim_an_already_owned_mosque(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create(['role' => User::ROLE_MOSQUE_ADMIN]);
        $mosque = Mosque::factory()->create([
            'owner_id' => $owner->id,
            'verification_status' => Mosque::VERIFICATION_VERIFIED,
        ]);
        $this->actingAsNormalUser();

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
            'document' => UploadedFile::fake()->create('proof.pdf', 512, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I manage this mosque.',
        ])->assertStatus(409)
            ->assertJsonPath('message', 'This mosque has already been claimed by an administrator.');
    }

    public function test_super_admin_cannot_submit_a_claim(): void
    {
        Storage::fake('local');
        $mosque = Mosque::factory()->create(['owner_id' => null]);
        $this->actingAsRole(User::ROLE_SUPER_ADMIN);

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
            'document' => UploadedFile::fake()->create('proof.pdf', 512, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I manage this mosque.',
        ])->assertForbidden();
    }

    public function test_existing_mosque_admin_cannot_submit_a_claim(): void
    {
        Storage::fake('local');
        $mosque = Mosque::factory()->create(['owner_id' => null]);
        $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
            'document' => UploadedFile::fake()->create('proof.pdf', 512, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I manage this mosque.',
        ])->assertForbidden();
    }

    public function test_claims_can_be_disabled_by_super_admin(): void
    {
        Storage::fake('local');
        SystemSetting::query()->create(['key' => 'claims_enabled', 'value' => false]);
        $mosque = Mosque::factory()->create(['owner_id' => null]);
        $this->actingAsNormalUser();

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
            'document' => UploadedFile::fake()->create('proof.pdf', 512, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I manage this mosque.',
        ])->assertStatus(503);
    }

    public function test_applicant_can_list_their_own_claims_with_status(): void
    {
        $user = $this->actingAsNormalUser();
        Mosque::factory()->count(2)->create(['owner_id' => null]);

        $pending = VerificationRequest::factory()->create([
            'user_id' => $user->id,
            'status' => VerificationRequest::STATUS_PENDING,
        ]);
        $rejected = VerificationRequest::factory()->create([
            'user_id' => $user->id,
            'status' => VerificationRequest::STATUS_REJECTED,
            'review_note' => 'Proof did not establish authority.',
            'reviewed_at' => now(),
        ]);

        $this->getJson('/api/me/mosque-claims')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $rejected->id)
            ->assertJsonPath('data.0.status_label', 'rejected')
            ->assertJsonPath('data.0.rejection_reason', 'Proof did not establish authority.')
            ->assertJsonPath('data.1.id', $pending->id)
            ->assertJsonPath('data.1.status_label', 'pending');
    }

    public function test_applicant_can_view_their_own_claim_detail(): void
    {
        $user = $this->actingAsNormalUser();
        $claim = VerificationRequest::factory()->create([
            'user_id' => $user->id,
            'status' => VerificationRequest::STATUS_PENDING,
        ]);

        $this->getJson("/api/me/mosque-claims/{$claim->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $claim->id)
            ->assertJsonPath('data.status_label', 'pending');
    }

    public function test_applicant_cannot_view_another_users_claim(): void
    {
        $this->actingAsNormalUser();
        $otherUser = User::factory()->create();
        $claim = VerificationRequest::factory()->create([
            'user_id' => $otherUser->id,
            'status' => VerificationRequest::STATUS_PENDING,
        ]);

        $this->getJson("/api/me/mosque-claims/{$claim->id}")
            ->assertForbidden();
    }

    public function test_unauthenticated_user_cannot_list_claims(): void
    {
        $this->getJson('/api/me/mosque-claims')->assertUnauthorized();
    }

    public function test_under_review_status_is_surfaced_as_pending_to_applicant(): void
    {
        $user = $this->actingAsNormalUser();
        VerificationRequest::factory()->create([
            'user_id' => $user->id,
            'status' => VerificationRequest::STATUS_UNDER_HUMAN_REVIEW,
        ]);

        $this->getJson('/api/me/mosque-claims')
            ->assertOk()
            ->assertJsonPath('data.0.status_label', 'pending');
    }

    public function test_invalid_document_type_is_rejected(): void
    {
        Storage::fake('local');
        $mosque = Mosque::factory()->create(['owner_id' => null]);
        $this->actingAsNormalUser();

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
            'document' => UploadedFile::fake()->create('notes.txt', 512, 'text/plain'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I manage this mosque.',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('document');
    }

    public function test_oversized_document_is_rejected(): void
    {
        Storage::fake('local');
        $mosque = Mosque::factory()->create(['owner_id' => null]);
        $this->actingAsNormalUser();

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
            'document' => UploadedFile::fake()->create('proof.pdf', 10241, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I manage this mosque.',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('document');
    }

    public function test_server_controlled_fields_cannot_be_spoofed(): void
    {
        Storage::fake('local');
        $user = $this->actingAsNormalUser();
        $otherUser = User::factory()->create();
        $mosque = Mosque::factory()->create(['owner_id' => null]);

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
            'document' => UploadedFile::fake()->create('proof.pdf', 512, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I manage this mosque.',
            'user_id' => $otherUser->id,
            'status' => VerificationRequest::STATUS_APPROVED,
            'reviewer_id' => $otherUser->id,
            'document_path' => 'verification/spoofed.pdf',
            'submitted_at' => now()->toIso8601String(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['user_id', 'status', 'reviewer_id', 'document_path', 'submitted_at']);

        $this->assertDatabaseMissing('verification_requests', [
            'user_id' => $otherUser->id,
            'mosque_id' => $mosque->id,
        ]);

        $this->assertDatabaseMissing('verification_requests', [
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
        ]);
    }

    public function test_rejected_claim_does_not_block_a_new_claim(): void
    {
        Storage::fake('local');
        $user = $this->actingAsNormalUser();
        $mosque = Mosque::factory()->create(['owner_id' => null]);

        VerificationRequest::factory()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'status' => VerificationRequest::STATUS_REJECTED,
            'review_note' => 'Proof did not establish authority.',
            'reviewed_at' => now(),
        ]);

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => $mosque->id,
            'document' => UploadedFile::fake()->create('proof.pdf', 512, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I manage this mosque.',
        ])->assertCreated()
            ->assertJsonPath('data.status_label', 'pending');

        $this->assertDatabaseCount('verification_requests', 2);
        $this->assertDatabaseHas('verification_requests', [
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'status' => VerificationRequest::STATUS_PENDING,
        ]);
    }

    public function test_user_who_already_owns_a_mosque_cannot_submit_any_claim(): void
    {
        Storage::fake('local');
        $owner = $this->actingAsNormalUser();
        Mosque::factory()->create(['owner_id' => $owner->id]);
        $target = Mosque::factory()->create(['owner_id' => null]);

        $this->postJson('/api/mosque-claims', [
            'mosque_id' => $target->id,
            'document' => UploadedFile::fake()->create('proof.pdf', 512, 'application/pdf'),
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I manage this mosque.',
        ])->assertForbidden();
    }

    public function test_database_rejects_second_open_claim_for_same_user_and_mosque(): void
    {
        $user = User::factory()->create();
        $mosque = Mosque::factory()->create(['owner_id' => null]);

        VerificationRequest::factory()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'status' => VerificationRequest::STATUS_PENDING,
        ]);

        $this->expectException(QueryException::class);

        VerificationRequest::factory()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'status' => VerificationRequest::STATUS_PENDING,
        ]);
    }

    public function test_database_allows_new_claim_after_previous_claim_was_rejected(): void
    {
        $user = User::factory()->create();
        $mosque = Mosque::factory()->create(['owner_id' => null]);

        VerificationRequest::factory()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'status' => VerificationRequest::STATUS_REJECTED,
        ]);

        $claim = VerificationRequest::factory()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'status' => VerificationRequest::STATUS_PENDING,
        ]);

        $this->assertSame(
            VerificationRequest::activeClaimKeyFor($user->id, $mosque->id),
            $claim->active_claim_key,
        );

        $first = VerificationRequest::query()->where('user_id', $user->id)->where('mosque_id', $mosque->id)->where('status', VerificationRequest::STATUS_REJECTED)->first();
        $this->assertNull($first->active_claim_key);
    }

    public function test_nonexistent_claim_returns_404(): void
    {
        $this->actingAsNormalUser();

        $this->getJson('/api/me/mosque-claims/999999')->assertNotFound();
    }

    private function actingAsRole(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function actingAsNormalUser(): User
    {
        return $this->actingAsRole(User::ROLE_NORMAL_USER);
    }
}
