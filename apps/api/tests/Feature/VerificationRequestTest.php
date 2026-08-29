<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VerificationRequestTest extends TestCase
{
    use RefreshDatabase;

    private int $phoneSequence = 2000;

    private function validProof(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            'committee-auth.pdf',
            "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
        );
    }

    public function test_unauthenticated_user_cannot_submit_verification_request(): void
    {
        $mosque = $this->createMosque();

        $this->postJson('/api/verification-requests', [
            'mosque_id' => $mosque->id,
        ])->assertUnauthorized();
    }

    public function test_unauthenticated_user_cannot_read_own_verification_status(): void
    {
        $this->getJson('/api/verification-requests/me')->assertUnauthorized();
    }

    public function test_unauthenticated_user_cannot_read_verification_request(): void
    {
        $user = $this->createUser(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();
        $request = $this->createVerificationRequest($user, $mosque);

        $this->getJson("/api/verification-requests/{$request->id}")->assertUnauthorized();
    }

    public function test_authenticated_user_can_submit_verification_request(): void
    {
        Storage::fake('local');

        $user = $this->actingAsRole(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();

        $response = $this->postJson('/api/verification-requests', [
            'mosque_id' => $mosque->id,
            'proof_document' => $this->validProof(),
        ])->assertCreated()
            ->assertJsonPath('data.status', VerificationRequest::STATUS_PENDING)
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.mosque_id', $mosque->id);

        $id = $response->json('data.id');

        $this->assertDatabaseHas('verification_requests', [
            'id' => $id,
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'status' => VerificationRequest::STATUS_PENDING,
        ]);

        Storage::disk('local')->assertExists('verification/'.$user->id.'/committee-auth.pdf');
    }

    public function test_proof_document_is_required(): void
    {
        $this->actingAsRole(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();

        $this->postJson('/api/verification-requests', [
            'mosque_id' => $mosque->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('proof_document');
    }

    public function test_invalid_proof_document_type_is_rejected(): void
    {
        $this->actingAsRole(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();

        $this->postJson('/api/verification-requests', [
            'mosque_id' => $mosque->id,
            'proof_document' => UploadedFile::fake()->create('committee-auth.exe', 200, 'application/x-msdownload'),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('proof_document');
    }

    public function test_missing_or_nonexistent_mosque_is_rejected(): void
    {
        $this->actingAsRole(User::ROLE_NORMAL_USER);

        $this->postJson('/api/verification-requests', [
            'proof_document' => $this->validProof(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('mosque_id');
    }

    public function test_duplicate_active_request_for_same_user_is_rejected(): void
    {
        $user = $this->actingAsRole(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();
        $this->createVerificationRequest($user, $mosque);

        $otherMosque = $this->createMosque();

        $this->postJson('/api/verification-requests', [
            'mosque_id' => $otherMosque->id,
            'proof_document' => $this->validProof(),
        ])->assertConflict()
            ->assertJson([
                'message' => 'A verification request is already in progress for this user or mosque.',
            ]);
    }

    public function test_duplicate_active_request_for_same_mosque_is_rejected(): void
    {
        $mosque = $this->createMosque();
        $this->actingAsRole(User::ROLE_NORMAL_USER);
        $owner = $this->createUser(User::ROLE_NORMAL_USER);
        $this->createVerificationRequest($owner, $mosque);

        $this->postJson('/api/verification-requests', [
            'mosque_id' => $mosque->id,
            'proof_document' => $this->validProof(),
        ])->assertConflict();
    }

    public function test_resubmission_is_allowed_after_terminal_status(): void
    {
        Storage::fake('local');

        $user = $this->actingAsRole(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();
        $this->createVerificationRequest($user, $mosque, VerificationRequest::STATUS_REJECTED);

        $this->postJson('/api/verification-requests', [
            'mosque_id' => $mosque->id,
            'proof_document' => $this->validProof(),
        ])->assertCreated();
    }

    public function test_current_user_can_check_their_verification_status(): void
    {
        $user = $this->actingAsRole(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();
        $verificationRequest = $this->createVerificationRequest($user, $mosque);

        $this->getJson('/api/verification-requests/me')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $verificationRequest->id)
            ->assertJsonPath('data.0.status', VerificationRequest::STATUS_PENDING);
    }

    public function test_owner_can_read_a_specific_verification_request(): void
    {
        $user = $this->actingAsRole(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();
        $verificationRequest = $this->createVerificationRequest($user, $mosque);

        $this->getJson("/api/verification-requests/{$verificationRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $verificationRequest->id)
            ->assertJsonPath('data.status', VerificationRequest::STATUS_PENDING);
    }

    public function test_non_owner_cannot_read_another_users_verification_request(): void
    {
        $this->actingAsRole(User::ROLE_NORMAL_USER);
        $owner = $this->createUser(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();
        $verificationRequest = $this->createVerificationRequest($owner, $mosque);

        $this->getJson("/api/verification-requests/{$verificationRequest->id}")
            ->assertForbidden();
    }

    private function actingAsRole(string $role): User
    {
        $user = $this->createUser($role);

        Sanctum::actingAs($user);

        return $user;
    }

    private function createUser(string $role): User
    {
        $this->phoneSequence++;

        return User::factory()->create([
            'phone' => '+1444555'.$this->phoneSequence,
            'role' => $role,
        ]);
    }

    private function createMosque(?User $owner = null): Mosque
    {
        $this->phoneSequence++;

        return Mosque::forceCreate([
            'owner_id' => $owner?->id,
            'name' => 'Verification Mosque '.$this->phoneSequence,
            'address' => '456 Test Avenue',
            'latitude' => 23.7290000,
            'longitude' => 90.4138000,
            'phone' => '+1444999'.$this->phoneSequence,
            'description' => 'A mosque used for verification request tests.',
            'verification_status' => Mosque::VERIFICATION_UNVERIFIED,
        ]);
    }

    private function createVerificationRequest(
        User $user,
        Mosque $mosque,
        string $status = VerificationRequest::STATUS_PENDING
    ): VerificationRequest {
        return VerificationRequest::query()->create([
            'user_id' => $user->id,
            'mosque_id' => $mosque->id,
            'document_path' => 'verification/'.$user->id.'/test-auth.pdf',
            'status' => $status,
            'submitted_at' => now(),
        ]);
    }
}
