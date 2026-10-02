<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Mosque;
use App\Models\MosqueMember;
use App\Models\Notification;
use App\Models\PhoneOtpVerification;
use App\Models\User;
use App\Support\MosqueAbility;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class MosqueTeamTest extends TestCase
{
    use RefreshDatabase;

    private int $phoneSequence = 100;

    public function test_setting_owner_id_puts_the_owner_on_the_team(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);

        $this->assertDatabaseHas('mosque_members', [
            'mosque_id' => $mosque->id,
            'user_id' => $owner->id,
            'role' => MosqueMember::ROLE_OWNER,
        ]);
        $this->assertNotNull(MosqueMember::query()->where('mosque_id', $mosque->id)->value('accepted_at'));
    }

    public function test_role_table_matches_the_issue(): void
    {
        $this->assertSame(MosqueAbility::ABILITIES, MosqueAbility::forRole('owner'));
        $this->assertTrue(MosqueAbility::roleAllows('manager', MosqueAbility::SETTINGS));
        $this->assertTrue(MosqueAbility::roleAllows('manager', MosqueAbility::TEAM));
        $this->assertFalse(MosqueAbility::roleAllows('manager', MosqueAbility::MEMBERS));
        $this->assertTrue(MosqueAbility::roleAllows('editor', MosqueAbility::CONTENT));
        $this->assertFalse(MosqueAbility::roleAllows('editor', MosqueAbility::SETTINGS));
        $this->assertFalse(MosqueAbility::roleAllows('editor', MosqueAbility::TEAM));
        $this->assertFalse(MosqueAbility::roleAllows('editor', MosqueAbility::PRAYER_TIMES));
        $this->assertTrue(MosqueAbility::roleAllows('prayer_times', MosqueAbility::PRAYER_TIMES));
        $this->assertFalse(MosqueAbility::roleAllows('prayer_times', MosqueAbility::CONTENT));
        $this->assertSame([], MosqueAbility::forRole(null));
    }

    /**
     * @return array<string, array{string, string, int}>
     */
    public static function roleMatrix(): array
    {
        $expected = [
            //               owner manager editor prayer_times
            'dashboard' => [200, 200, 200, 200],
            'team list' => [200, 200, 200, 200],
            'announcement' => [201, 201, 201, 403],
            'event list' => [200, 200, 200, 403],
            'campaign list' => [200, 200, 200, 403],
            'volunteer list' => [200, 200, 200, 403],
            'insights' => [200, 200, 200, 403],
            'prayer schedule' => [200, 200, 403, 200],
            'eid jamaats' => [200, 200, 403, 200],
            'profile' => [200, 200, 403, 403],
            'invite' => [201, 201, 403, 403],
            'change role' => [200, 403, 403, 403],
        ];

        $cases = [];
        foreach ($expected as $action => $statuses) {
            foreach (MosqueMember::ROLES as $index => $role) {
                $cases["{$role}: {$action}"] = [$role, $action, $statuses[$index]];
            }
        }

        return $cases;
    }

    #[DataProvider('roleMatrix')]
    public function test_each_role_can_only_use_its_sections(string $role, string $action, int $status): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $member = $role === 'owner' ? $owner : $this->teamMember($mosque, $role);
        $other = $this->teamMember($mosque, MosqueMember::ROLE_EDITOR);
        $otherMembership = MosqueMember::query()->where('user_id', $other->id)->firstOrFail();
        Sanctum::actingAs($member);

        $base = "/api/admin/mosques/{$mosque->id}";
        $response = match ($action) {
            'dashboard' => $this->getJson("{$base}/dashboard"),
            'team list' => $this->getJson("{$base}/members"),
            'announcement' => $this->postJson("{$base}/announcements", ['title' => 'Notice', 'body' => 'Body text', 'urgency' => 'low']),
            'event list' => $this->getJson("{$base}/events"),
            'campaign list' => $this->getJson("{$base}/campaigns"),
            'volunteer list' => $this->getJson("{$base}/volunteer-opportunities"),
            'insights' => $this->getJson("{$base}/insights"),
            'prayer schedule' => $this->putJson("{$base}/prayer-schedule", ['prayer_schedule' => [['prayer' => 'isha', 'adhan_time' => '19:45', 'jamaat_time' => '20:15']]]),
            'eid jamaats' => $this->getJson("{$base}/eid-jamaats"),
            'profile' => $this->patchJson($base, ['phone' => '+880 2-1234567']),
            'invite' => $this->postJson("{$base}/members", ['phone' => $this->nextPhone(), 'role' => 'editor']),
            'change role' => $this->patchJson("{$base}/members/{$otherMembership->id}", ['role' => 'manager']),
        };

        $response->assertStatus($status);
        if ($status === 403) {
            $response->assertJson(['message' => 'Your team role does not allow this.']);
        }
    }

    public function test_owner_invites_a_committee_member_as_editor_who_can_post_but_not_change_the_team(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $secretary = $this->user(User::ROLE_NORMAL_USER);

        Sanctum::actingAs($owner);
        $this->postJson("/api/admin/mosques/{$mosque->id}/members", ['phone' => $secretary->phone, 'role' => 'editor'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.role', 'editor')
            ->assertJsonPath('data.user.id', $secretary->id);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $secretary->id,
            'mosque_id' => $mosque->id,
            'type' => Notification::TYPE_TEAM,
        ]);

        // Before accepting, the invitee has no access.
        Sanctum::actingAs($secretary->fresh());
        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")->assertForbidden();
        $this->getJson('/api/auth/me')->assertJsonPath('user.pending_mosque_invites_count', 1);

        $invite = $this->getJson('/api/me/mosque-invites')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.mosque.name', $mosque->name)
            ->assertJsonPath('data.0.invited_by.name', $owner->name)
            ->json('data.0');

        $this->postJson("/api/me/mosque-invites/{$invite['id']}/accept")->assertOk();

        $secretary->refresh();
        $this->assertSame(User::ROLE_MOSQUE_ADMIN, $secretary->role);
        Sanctum::actingAs($secretary);

        $this->getJson('/api/auth/me')
            ->assertJsonPath('user.status', 'approved')
            ->assertJsonPath('user.managed_mosques.0.id', $mosque->id)
            ->assertJsonPath('user.managed_mosques.0.role', 'editor')
            ->assertJsonPath('user.managed_mosques.0.abilities', ['view', 'content'])
            ->assertJsonPath('user.pending_mosque_invites_count', 0);

        // The editor can post announcements...
        $this->postJson("/api/admin/mosques/{$mosque->id}/announcements", [
            'title' => 'Iftar tonight',
            'body' => 'Everyone is welcome.',
            'urgency' => 'low',
        ])->assertCreated();

        // ...but cannot change the team or the mosque settings.
        $ownerMembership = MosqueMember::query()->where('user_id', $owner->id)->firstOrFail();
        $this->postJson("/api/admin/mosques/{$mosque->id}/members", ['phone' => $this->nextPhone(), 'role' => 'editor'])->assertForbidden();
        $this->patchJson("/api/admin/mosques/{$mosque->id}/members/{$ownerMembership->id}", ['role' => 'editor'])->assertForbidden();
        $this->deleteJson("/api/admin/mosques/{$mosque->id}/members/{$ownerMembership->id}")->assertForbidden();
        $this->patchJson("/api/admin/mosques/{$mosque->id}", ['name' => 'Renamed'])->assertForbidden();
    }

    public function test_invite_to_a_phone_without_an_account_is_attached_when_they_register(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $phone = '+8801999000111';

        Sanctum::actingAs($owner);
        $this->postJson("/api/admin/mosques/{$mosque->id}/members", ['phone' => $phone, 'role' => 'prayer_times'])
            ->assertCreated()
            ->assertJsonPath('data.has_account', false)
            ->assertJsonPath('data.phone', $phone);

        $this->assertDatabaseHas('mosque_members', ['mosque_id' => $mosque->id, 'phone' => $phone, 'user_id' => null]);

        PhoneOtpVerification::query()->create([
            'phone' => $phone,
            'otp_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(5),
        ]);
        $this->app['auth']->forgetGuards();

        $this->postJson('/api/auth/verify-otp', ['phone' => $phone, 'otp' => '123456'])
            ->assertOk()
            ->assertJsonPath('user.pending_mosque_invites_count', 1);

        $newUser = User::query()->where('phone', $phone)->firstOrFail();
        $this->assertDatabaseHas('mosque_members', ['mosque_id' => $mosque->id, 'user_id' => $newUser->id, 'accepted_at' => null]);
        $this->assertDatabaseHas('notifications', ['user_id' => $newUser->id, 'type' => Notification::TYPE_TEAM]);
    }

    public function test_invitee_can_decline_and_cannot_touch_someone_elses_invite(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $invitee = $this->user(User::ROLE_NORMAL_USER);
        $stranger = $this->user(User::ROLE_NORMAL_USER);
        $invite = MosqueMember::query()->create(['mosque_id' => $mosque->id, 'user_id' => $invitee->id, 'role' => 'editor', 'invited_by' => $owner->id]);

        Sanctum::actingAs($stranger);
        $this->postJson("/api/me/mosque-invites/{$invite->id}/accept")->assertNotFound();
        $this->postJson("/api/me/mosque-invites/{$invite->id}/decline")->assertNotFound();

        Sanctum::actingAs($invitee);
        $this->postJson("/api/me/mosque-invites/{$invite->id}/decline")->assertOk();
        $this->assertDatabaseMissing('mosque_members', ['id' => $invite->id]);
        $this->assertSame(User::ROLE_NORMAL_USER, $invitee->fresh()->role);
    }

    public function test_cannot_invite_someone_twice_and_only_owners_can_invite_owners(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $manager = $this->teamMember($mosque, MosqueMember::ROLE_MANAGER);

        Sanctum::actingAs($owner);
        $this->postJson("/api/admin/mosques/{$mosque->id}/members", ['phone' => $manager->phone, 'role' => 'editor'])
            ->assertUnprocessable()
            ->assertJson(['message' => 'This person is already on the team.']);

        $phone = $this->nextPhone();
        $this->postJson("/api/admin/mosques/{$mosque->id}/members", ['phone' => $phone, 'role' => 'editor'])->assertCreated();
        $this->postJson("/api/admin/mosques/{$mosque->id}/members", ['phone' => $phone, 'role' => 'editor'])
            ->assertUnprocessable()
            ->assertJson(['message' => 'This person has already been invited.']);

        $this->postJson("/api/admin/mosques/{$mosque->id}/members", ['phone' => '01712345678', 'role' => 'editor'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('phone');

        Sanctum::actingAs($manager);
        $this->postJson("/api/admin/mosques/{$mosque->id}/members", ['phone' => $this->nextPhone(), 'role' => 'owner'])->assertForbidden();
        $this->postJson("/api/admin/mosques/{$mosque->id}/members", ['phone' => $this->nextPhone(), 'role' => 'manager'])->assertCreated();
    }

    public function test_manager_can_cancel_an_invitation_but_not_remove_a_member(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $manager = $this->teamMember($mosque, MosqueMember::ROLE_MANAGER);
        $editor = $this->teamMember($mosque, MosqueMember::ROLE_EDITOR);
        $pending = MosqueMember::query()->create(['mosque_id' => $mosque->id, 'phone' => $this->nextPhone(), 'role' => 'editor', 'invited_by' => $owner->id]);
        $editorMembership = MosqueMember::query()->where('user_id', $editor->id)->firstOrFail();

        Sanctum::actingAs($manager);
        $this->deleteJson("/api/admin/mosques/{$mosque->id}/members/{$editorMembership->id}")->assertForbidden();
        $this->deleteJson("/api/admin/mosques/{$mosque->id}/members/{$pending->id}")
            ->assertOk()
            ->assertJson(['message' => 'Invitation cancelled.']);
    }

    public function test_the_last_owner_cannot_be_demoted_removed_or_leave(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $membership = MosqueMember::query()->where('user_id', $owner->id)->firstOrFail();

        Sanctum::actingAs($owner);
        $this->patchJson("/api/admin/mosques/{$mosque->id}/members/{$membership->id}", ['role' => 'manager'])
            ->assertUnprocessable()
            ->assertJson(['message' => 'A mosque needs at least one owner. Make someone else an owner first.']);
        $this->deleteJson("/api/admin/mosques/{$mosque->id}/members/{$membership->id}")->assertUnprocessable();
        $this->postJson("/api/admin/mosques/{$mosque->id}/leave")->assertUnprocessable();

        $this->assertDatabaseHas('mosque_members', ['id' => $membership->id, 'role' => 'owner']);
    }

    public function test_with_a_second_owner_the_first_can_step_down_and_owner_id_follows(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $treasurer = $this->teamMember($mosque, MosqueMember::ROLE_MANAGER);
        $treasurerMembership = MosqueMember::query()->where('user_id', $treasurer->id)->firstOrFail();
        $ownerMembership = MosqueMember::query()->where('user_id', $owner->id)->firstOrFail();

        Sanctum::actingAs($owner);
        $this->patchJson("/api/admin/mosques/{$mosque->id}/members/{$treasurerMembership->id}", ['role' => 'owner'])
            ->assertOk()
            ->assertJsonPath('data.role', 'owner');
        $this->patchJson("/api/admin/mosques/{$mosque->id}/members/{$ownerMembership->id}", ['role' => 'editor'])->assertOk();

        $this->assertSame($treasurer->id, $mosque->fresh()->owner_id);
    }

    public function test_member_can_leave_and_loses_mosque_admin_role(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $editor = $this->teamMember($mosque, MosqueMember::ROLE_EDITOR);

        Sanctum::actingAs($editor);
        $this->postJson("/api/admin/mosques/{$mosque->id}/leave")->assertOk();

        $this->assertDatabaseMissing('mosque_members', ['mosque_id' => $mosque->id, 'user_id' => $editor->id]);
        $this->assertSame(User::ROLE_NORMAL_USER, $editor->fresh()->role);
    }

    public function test_member_id_from_another_mosque_is_not_found(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $otherOwner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $otherMosque = $this->mosque($otherOwner);
        $foreign = MosqueMember::query()->where('mosque_id', $otherMosque->id)->firstOrFail();

        Sanctum::actingAs($owner);
        $this->patchJson("/api/admin/mosques/{$mosque->id}/members/{$foreign->id}", ['role' => 'editor'])->assertNotFound();
        $this->getJson("/api/admin/mosques/{$otherMosque->id}/members")->assertForbidden();
    }

    public function test_team_list_shows_roles_and_my_abilities(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $editor = $this->teamMember($mosque, MosqueMember::ROLE_EDITOR);
        MosqueMember::query()->create(['mosque_id' => $mosque->id, 'phone' => '+8801888000999', 'role' => 'prayer_times', 'invited_by' => $owner->id]);

        Sanctum::actingAs($editor);
        $this->getJson("/api/admin/mosques/{$mosque->id}/members")
            ->assertOk()
            ->assertJsonPath('role', 'editor')
            ->assertJsonPath('abilities', ['view', 'content'])
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.role', 'owner')
            ->assertJsonPath('data.1.role', 'editor')
            ->assertJsonPath('data.2.status', 'pending')
            ->assertJsonPath('data.2.phone', '+8801888000999');
    }

    public function test_prayer_times_member_gets_the_dashboard_without_content_data(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $muazzin = $this->teamMember($mosque, MosqueMember::ROLE_PRAYER_TIMES);

        Sanctum::actingAs($muazzin);
        $this->getJson("/api/admin/mosques/{$mosque->id}/dashboard")
            ->assertOk()
            ->assertJsonPath('data.pending_pledges', [])
            ->assertJsonPath('data.recent_content', [])
            ->assertJsonPath('data.summary.pending_pledges_count', 0);
    }

    public function test_super_admin_transfers_ownership_and_it_is_audited(): void
    {
        $superAdmin = $this->user(User::ROLE_SUPER_ADMIN);
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $imam = $this->user(User::ROLE_NORMAL_USER);

        Sanctum::actingAs($superAdmin);
        $this->postJson("/api/super-admin/mosques/{$mosque->id}/transfer", ['user_id' => $imam->id])
            ->assertOk()
            ->assertJsonPath('data.owner.id', $imam->id);

        $this->assertSame($imam->id, $mosque->fresh()->owner_id);
        $this->assertSame(User::ROLE_MOSQUE_ADMIN, $imam->fresh()->role);
        $this->assertDatabaseHas('mosque_members', ['mosque_id' => $mosque->id, 'user_id' => $imam->id, 'role' => 'owner']);
        $this->assertDatabaseHas('mosque_members', ['mosque_id' => $mosque->id, 'user_id' => $owner->id, 'role' => 'manager']);
        $this->assertDatabaseHas('notifications', ['user_id' => $imam->id, 'type' => Notification::TYPE_TEAM]);

        $log = AdminAuditLog::query()->where('action', 'mosque.ownership_transferred')->firstOrFail();
        $this->assertSame($superAdmin->id, $log->actor_id);
        $this->assertSame($mosque->id, $log->target_id);
        $this->assertSame([$owner->id], $log->metadata['previous_owner_ids']);

        // The new owner can now manage the team.
        Sanctum::actingAs($imam->fresh());
        $this->getJson("/api/admin/mosques/{$mosque->id}/members")->assertOk()->assertJsonPath('role', 'owner');
    }

    public function test_super_admin_transfer_can_remove_previous_owners(): void
    {
        $superAdmin = $this->user(User::ROLE_SUPER_ADMIN);
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $newOwner = $this->user(User::ROLE_NORMAL_USER);

        Sanctum::actingAs($superAdmin);
        $this->postJson("/api/super-admin/mosques/{$mosque->id}/transfer", ['user_id' => $newOwner->id, 'previous_owners' => 'remove'])->assertOk();

        $this->assertDatabaseMissing('mosque_members', ['mosque_id' => $mosque->id, 'user_id' => $owner->id]);
        $this->assertSame(User::ROLE_NORMAL_USER, $owner->fresh()->role);

        $this->postJson("/api/super-admin/mosques/{$mosque->id}/transfer", ['user_id' => $superAdmin->id])->assertUnprocessable();
        $this->postJson("/api/super-admin/mosques/{$mosque->id}/transfer", ['user_id' => 999999])->assertUnprocessable();
    }

    public function test_super_admin_revokes_a_member_even_the_last_owner_and_it_is_audited(): void
    {
        $superAdmin = $this->user(User::ROLE_SUPER_ADMIN);
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);

        Sanctum::actingAs($superAdmin);
        $this->getJson("/api/super-admin/mosques/{$mosque->id}/members")->assertOk()->assertJsonCount(1, 'data');
        $this->deleteJson("/api/super-admin/mosques/{$mosque->id}/members/{$owner->id}")->assertOk();

        $this->assertNull($mosque->fresh()->owner_id);
        $this->assertSame(User::ROLE_NORMAL_USER, $owner->fresh()->role);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'mosque.member_revoked', 'target_id' => $mosque->id, 'actor_id' => $superAdmin->id]);

        $this->deleteJson("/api/super-admin/mosques/{$mosque->id}/members/{$owner->id}")->assertNotFound();
    }

    public function test_only_super_admins_can_use_transfer_and_revoke(): void
    {
        $owner = $this->user(User::ROLE_MOSQUE_ADMIN);
        $mosque = $this->mosque($owner);
        $other = $this->user(User::ROLE_NORMAL_USER);

        Sanctum::actingAs($owner);
        $this->postJson("/api/super-admin/mosques/{$mosque->id}/transfer", ['user_id' => $other->id])->assertForbidden();
        $this->deleteJson("/api/super-admin/mosques/{$mosque->id}/members/{$owner->id}")->assertForbidden();
    }

    public function test_claim_approval_makes_the_applicant_the_owner_on_the_team(): void
    {
        $superAdmin = $this->user(User::ROLE_SUPER_ADMIN);
        $applicant = $this->user(User::ROLE_NORMAL_USER);
        $mosque = $this->mosque(null, Mosque::VERIFICATION_PENDING);
        $claim = $applicant->verificationRequests()->create([
            'mosque_id' => $mosque->id,
            'document_path' => 'verification/test.pdf',
            'role_at_mosque' => 'Imam',
            'verification_reason' => 'I lead prayers here.',
            'status' => 'pending',
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($superAdmin);
        $this->patchJson("/api/super-admin/claims/{$claim->id}/approve")->assertOk();

        $this->assertDatabaseHas('mosque_members', ['mosque_id' => $mosque->id, 'user_id' => $applicant->id, 'role' => 'owner']);
    }

    private function nextPhone(): string
    {
        return '+88017000'.str_pad((string) ++$this->phoneSequence, 5, '0', STR_PAD_LEFT);
    }

    private function user(string $role): User
    {
        return User::factory()->create(['phone' => $this->nextPhone(), 'role' => $role]);
    }

    private function mosque(?User $owner, string $status = Mosque::VERIFICATION_VERIFIED): Mosque
    {
        return Mosque::factory()->create([
            'owner_id' => $owner?->id,
            'verification_status' => $status,
            'latitude' => 23.7290000,
            'longitude' => 90.4138000,
        ]);
    }

    private function teamMember(Mosque $mosque, string $role): User
    {
        $user = $this->user(User::ROLE_MOSQUE_ADMIN);
        MosqueMember::query()->create([
            'mosque_id' => $mosque->id,
            'user_id' => $user->id,
            'role' => $role,
            'accepted_at' => now(),
        ]);

        return $user;
    }
}
