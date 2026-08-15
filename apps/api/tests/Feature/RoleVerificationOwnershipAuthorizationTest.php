<?php

namespace Tests\Feature;

use App\Models\Mosque;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleVerificationOwnershipAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private int $phoneSequence = 1000;

    public function test_unauthenticated_user_receives_401_on_protected_admin_api(): void
    {
        $mosque = $this->createMosque();

        $this->getJson("/api/admin/mosques/{$mosque->id}")
            ->assertUnauthorized();
    }

    public function test_normal_user_receives_403_on_mosque_admin_endpoint(): void
    {
        $this->actingAsRole(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();

        $this->getJson("/api/admin/mosques/{$mosque->id}")
            ->assertForbidden()
            ->assertJson([
                'message' => 'Forbidden.',
            ]);
    }

    public function test_normal_user_receives_403_on_super_admin_endpoint(): void
    {
        $this->actingAsRole(User::ROLE_NORMAL_USER);

        $this->getJson('/api/super-admin/overview')
            ->assertForbidden()
            ->assertJson([
                'message' => 'Forbidden.',
            ]);
    }

    public function test_mosque_admin_can_access_authorized_mosque_management_endpoint(): void
    {
        $admin = $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->createMosque($admin, Mosque::VERIFICATION_VERIFIED);

        $this->getJson("/api/admin/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('mosque.id', $mosque->id);
    }

    public function test_mosque_admin_can_manage_their_own_verified_mosque(): void
    {
        $admin = $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->createMosque($admin, Mosque::VERIFICATION_VERIFIED);

        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'name' => 'Updated Community Mosque',
        ])->assertOk()
            ->assertJsonPath('mosque.name', 'Updated Community Mosque');

        $this->assertDatabaseHas('mosques', [
            'id' => $mosque->id,
            'name' => 'Updated Community Mosque',
            'owner_id' => $admin->id,
        ]);
    }

    public function test_mosque_admin_receives_403_when_managing_another_users_mosque(): void
    {
        $admin = $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);
        $otherAdmin = $this->createUser(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->createMosque($otherAdmin, Mosque::VERIFICATION_VERIFIED);

        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'name' => 'Unauthorized Update',
        ])->assertForbidden();

        $this->assertDatabaseMissing('mosques', [
            'id' => $mosque->id,
            'name' => 'Unauthorized Update',
        ]);
    }

    public function test_mosque_admin_receives_403_when_mosque_is_unverified(): void
    {
        $admin = $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->createMosque($admin, Mosque::VERIFICATION_UNVERIFIED);

        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'name' => 'Should Not Update',
        ])->assertForbidden()
            ->assertJson([
                'message' => 'Mosque administration is not available until the mosque is verified.',
            ]);
    }

    public function test_mosque_admin_receives_403_when_mosque_verification_is_pending(): void
    {
        $admin = $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->createMosque($admin, Mosque::VERIFICATION_PENDING);

        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'name' => 'Should Not Update',
        ])->assertForbidden();
    }

    public function test_mosque_admin_receives_403_when_mosque_verification_is_rejected(): void
    {
        $admin = $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->createMosque($admin, Mosque::VERIFICATION_REJECTED);

        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'name' => 'Should Not Update',
        ])->assertForbidden();
    }

    public function test_mosque_admin_receives_403_on_super_admin_only_api(): void
    {
        $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);

        $this->getJson('/api/super-admin/overview')
            ->assertForbidden();
    }

    public function test_super_admin_can_access_authorized_mosque_administration(): void
    {
        $this->actingAsRole(User::ROLE_SUPER_ADMIN);
        $mosque = $this->createMosque(status: Mosque::VERIFICATION_PENDING);

        $this->getJson("/api/admin/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('mosque.id', $mosque->id);
    }

    public function test_super_admin_can_access_system_wide_admin_api(): void
    {
        $this->actingAsRole(User::ROLE_SUPER_ADMIN);

        $this->getJson('/api/super-admin/overview')
            ->assertOk()
            ->assertJsonStructure([
                'users_count',
                'mosques_count',
            ]);
    }

    public function test_super_admin_can_access_another_admins_mosque_on_system_wide_route(): void
    {
        $this->actingAsRole(User::ROLE_SUPER_ADMIN);
        $otherAdmin = $this->createUser(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->createMosque($otherAdmin, Mosque::VERIFICATION_VERIFIED);

        $this->getJson("/api/super-admin/mosques/{$mosque->id}")
            ->assertOk()
            ->assertJsonPath('mosque.id', $mosque->id);
    }

    public function test_changing_mosque_id_in_url_cannot_bypass_ownership(): void
    {
        $admin = $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);
        $otherAdmin = $this->createUser(User::ROLE_MOSQUE_ADMIN);
        $this->createMosque($admin, Mosque::VERIFICATION_VERIFIED);
        $otherMosque = $this->createMosque($otherAdmin, Mosque::VERIFICATION_VERIFIED);

        $this->patchJson("/api/admin/mosques/{$otherMosque->id}", [
            'name' => 'Hijacked Mosque Name',
        ])->assertForbidden();

        $this->assertDatabaseMissing('mosques', [
            'id' => $otherMosque->id,
            'name' => 'Hijacked Mosque Name',
        ]);
    }

    public function test_sending_different_owner_id_cannot_bypass_ownership(): void
    {
        $admin = $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);
        $otherAdmin = $this->createUser(User::ROLE_MOSQUE_ADMIN);
        $otherMosque = $this->createMosque($otherAdmin, Mosque::VERIFICATION_VERIFIED);

        $this->patchJson("/api/admin/mosques/{$otherMosque->id}", [
            'owner_id' => $admin->id,
            'name' => 'Forged Owner Update',
        ])->assertForbidden();

        $this->assertDatabaseHas('mosques', [
            'id' => $otherMosque->id,
            'owner_id' => $otherAdmin->id,
        ]);
    }

    public function test_owner_id_input_does_not_reassign_an_owned_mosque(): void
    {
        $admin = $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);
        $otherAdmin = $this->createUser(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->createMosque($admin, Mosque::VERIFICATION_VERIFIED);

        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'owner_id' => $otherAdmin->id,
            'name' => 'Allowed Content Update',
        ])->assertOk()
            ->assertJsonPath('mosque.owner_id', $admin->id);

        $this->assertDatabaseHas('mosques', [
            'id' => $mosque->id,
            'owner_id' => $admin->id,
            'name' => 'Allowed Content Update',
        ]);
    }

    public function test_normal_user_cannot_elevate_to_super_admin_by_submitting_role(): void
    {
        $normalUser = $this->actingAsRole(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();

        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'role' => User::ROLE_SUPER_ADMIN,
            'name' => 'Unauthorized Update',
        ])->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $normalUser->id,
            'role' => User::ROLE_NORMAL_USER,
        ]);
    }

    public function test_normal_user_cannot_elevate_to_mosque_admin_by_submitting_role(): void
    {
        $normalUser = $this->actingAsRole(User::ROLE_NORMAL_USER);
        $mosque = $this->createMosque();

        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'role' => User::ROLE_MOSQUE_ADMIN,
            'name' => 'Unauthorized Update',
        ])->assertForbidden();

        $this->assertDatabaseHas('users', [
            'id' => $normalUser->id,
            'role' => User::ROLE_NORMAL_USER,
        ]);
    }

    public function test_mosque_admin_cannot_elevate_to_super_admin_through_request_input(): void
    {
        $admin = $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->createMosque($admin, Mosque::VERIFICATION_VERIFIED);

        $this->patchJson("/api/admin/mosques/{$mosque->id}", [
            'role' => User::ROLE_SUPER_ADMIN,
            'name' => 'Legitimate Mosque Update',
        ])->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'role' => User::ROLE_MOSQUE_ADMIN,
        ]);
    }

    public function test_direct_api_request_without_frontend_restrictions_is_still_authorized(): void
    {
        $admin = $this->actingAsRole(User::ROLE_MOSQUE_ADMIN);
        $otherAdmin = $this->createUser(User::ROLE_MOSQUE_ADMIN);
        $otherMosque = $this->createMosque($otherAdmin, Mosque::VERIFICATION_VERIFIED);

        $this->patchJson("/api/admin/mosques/{$otherMosque->id}", [
            'user_id' => $admin->id,
            'owner_id' => $admin->id,
            'role' => User::ROLE_SUPER_ADMIN,
            'name' => 'Frontend Bypass Update',
        ])->assertForbidden();

        $this->assertDatabaseMissing('mosques', [
            'id' => $otherMosque->id,
            'name' => 'Frontend Bypass Update',
        ]);
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
            'phone' => '+1555555'.$this->phoneSequence,
            'role' => $role,
        ]);
    }

    private function createMosque(?User $owner = null, string $status = Mosque::VERIFICATION_VERIFIED): Mosque
    {
        $this->phoneSequence++;

        return Mosque::forceCreate([
            'owner_id' => $owner?->id,
            'name' => 'Test Mosque '.$this->phoneSequence,
            'address' => '123 Test Road',
            'latitude' => 23.7290000,
            'longitude' => 90.4138000,
            'phone' => '+1555999'.$this->phoneSequence,
            'description' => 'A mosque used for authorization tests.',
            'verification_status' => $status,
        ]);
    }
}
