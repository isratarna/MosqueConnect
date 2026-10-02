<?php

namespace App\Services;

use App\Models\AdminAuditLog;
use App\Models\Mosque;
use App\Models\MosqueMember;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Invitations and membership changes for a mosque's team.
 *
 * Two things are kept in step with the team here:
 *  - mosques.owner_id points at one of the mosque's owners (or null), for
 *    code that still reads it;
 *  - a user's account role is mosque_admin while they are on at least one
 *    team and normal_user once they are on none (super admins are left alone).
 */
class MosqueTeamService
{
    public const LAST_OWNER_MESSAGE = 'A mosque needs at least one owner. Make someone else an owner first.';

    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * Invite a person by phone number. If they have no account yet, the
     * invitation waits for them and is attached when they first log in.
     */
    public function invite(Mosque $mosque, User $inviter, string $phone, string $role): MosqueMember
    {
        $user = User::query()->where('phone', $phone)->first();

        $existing = MosqueMember::query()
            ->where('mosque_id', $mosque->id)
            ->where(fn ($query) => $user
                ? $query->where('user_id', $user->id)->orWhere('phone', $phone)
                : $query->where('phone', $phone))
            ->first();

        if ($existing) {
            abort(422, $existing->isAccepted()
                ? 'This person is already on the team.'
                : 'This person has already been invited.');
        }

        abort_if($user?->isSuspended(), 422, 'This account is suspended and cannot be invited.');

        $member = MosqueMember::query()->create([
            'mosque_id' => $mosque->id,
            'user_id' => $user?->id,
            'phone' => $phone,
            'role' => $role,
            'invited_by' => $inviter->id,
        ]);

        if ($user) {
            $this->notifyInvite($member->setRelation('mosque', $mosque)->setRelation('inviter', $inviter));
        }

        return $member;
    }

    /**
     * Give a newly signed-in user the invitations that were sent to their phone
     * number before they had an account.
     */
    public function attachPendingInvites(User $user): int
    {
        $invites = MosqueMember::query()
            ->whereNull('user_id')
            ->where('phone', $user->phone)
            ->pending()
            ->with(['mosque', 'inviter'])
            ->get();

        foreach ($invites as $invite) {
            // Skip any mosque the user somehow joined in the meantime.
            $alreadyMember = MosqueMember::query()
                ->where('mosque_id', $invite->mosque_id)
                ->where('user_id', $user->id)
                ->exists();

            if ($alreadyMember) {
                $invite->delete();

                continue;
            }

            $invite->update(['user_id' => $user->id]);
            $this->notifyInvite($invite);
        }

        return $invites->count();
    }

    public function accept(MosqueMember $invite): MosqueMember
    {
        abort_if($invite->isAccepted(), 422, 'This invitation has already been accepted.');

        DB::transaction(function () use ($invite): void {
            $invite->update(['accepted_at' => now()]);
            $this->syncOwnerColumn($invite->mosque);
            $this->syncUserRole($invite->user);
        });

        return $invite->refresh();
    }

    public function decline(MosqueMember $invite): void
    {
        abort_if($invite->isAccepted(), 422, 'This invitation has already been accepted.');

        $invite->delete();
    }

    public function changeRole(MosqueMember $member, string $role): MosqueMember
    {
        if ($member->role === $role) {
            return $member;
        }

        DB::transaction(function () use ($member, $role): void {
            if ($member->isOwner() && $member->isAccepted()) {
                $this->assertNotLastOwner($member);
            }

            $member->update(['role' => $role]);
            $this->syncOwnerColumn($member->mosque);
        });

        return $member->refresh();
    }

    /**
     * Remove a member or cancel an invitation. Only a super admin may remove
     * the last owner, which leaves the mosque without an admin.
     */
    public function remove(MosqueMember $member, bool $allowLastOwner = false): void
    {
        DB::transaction(function () use ($member, $allowLastOwner): void {
            if (! $allowLastOwner && $member->isOwner() && $member->isAccepted()) {
                $this->assertNotLastOwner($member);
            }

            $user = $member->user;
            $mosque = $member->mosque;
            $member->delete();

            $this->syncOwnerColumn($mosque);
            if ($user) {
                $this->syncUserRole($user);
            }
        });
    }

    /**
     * Make a user the mosque's owner. Existing owners become managers, or are
     * removed from the team when $previousOwners is "remove".
     */
    public function transferOwnership(Mosque $mosque, User $newOwner, string $previousOwners, User $actor): void
    {
        abort_if($newOwner->isSuspended(), 422, 'This account is suspended and cannot own a mosque.');

        DB::transaction(function () use ($mosque, $newOwner, $previousOwners, $actor): void {
            $formerOwners = MosqueMember::query()
                ->where('mosque_id', $mosque->id)
                ->where('role', MosqueMember::ROLE_OWNER)
                ->accepted()
                ->where('user_id', '!=', $newOwner->id)
                ->with('user')
                ->get();

            foreach ($formerOwners as $former) {
                if ($previousOwners === 'remove') {
                    $former->delete();
                } else {
                    $former->update(['role' => MosqueMember::ROLE_MANAGER]);
                }
            }

            $member = MosqueMember::query()->firstOrNew([
                'mosque_id' => $mosque->id,
                'user_id' => $newOwner->id,
            ]);
            $member->fill([
                'role' => MosqueMember::ROLE_OWNER,
                'accepted_at' => $member->accepted_at ?? now(),
                'invited_by' => $member->invited_by ?? $actor->id,
            ])->save();

            $mosque->forceFill(['owner_id' => $newOwner->id])->save();

            $this->syncUserRole($newOwner);
            foreach ($formerOwners as $former) {
                $this->syncUserRole($former->user);
            }

            AdminAuditLog::record($actor, 'mosque.ownership_transferred', $mosque, [
                'new_owner_id' => $newOwner->id,
                'previous_owner_ids' => $formerOwners->pluck('user_id')->all(),
                'previous_owners' => $previousOwners === 'remove' ? 'removed' : 'made_managers',
            ]);
        });

        $this->notifications->notifyUser($newOwner->id, $mosque, [
            'type' => Notification::TYPE_TEAM,
            'title' => 'You now own a mosque',
            'message' => "You are now the owner of {$mosque->name} on MosqueConnect.",
            'reference_type' => Notification::REFERENCE_MOSQUE_MEMBER,
            'reference_id' => (int) now()->getPreciseTimestamp(3),
        ]);
    }

    /**
     * Point mosques.owner_id at one of the team's owners, keeping the current
     * one when they are still an owner. Null when the team has no owner.
     */
    public function syncOwnerColumn(Mosque $mosque): void
    {
        $owners = MosqueMember::query()
            ->where('mosque_id', $mosque->id)
            ->where('role', MosqueMember::ROLE_OWNER)
            ->accepted()
            ->orderBy('accepted_at')
            ->orderBy('id')
            ->pluck('user_id');

        $ownerId = $owners->contains($mosque->owner_id) ? $mosque->owner_id : $owners->first();

        if ((int) $ownerId !== (int) $mosque->owner_id) {
            $mosque->forceFill(['owner_id' => $ownerId])->save();
        }
    }

    /**
     * mosque_admin while on a team, normal_user when on none.
     */
    public function syncUserRole(?User $user): void
    {
        if (! $user || $user->isSuperAdmin()) {
            return;
        }

        $onTeam = $user->mosqueMemberships()->accepted()->exists();

        if ($onTeam && $user->isNormalUser()) {
            $user->update(['role' => User::ROLE_MOSQUE_ADMIN]);
        } elseif (! $onTeam && $user->isMosqueAdmin()) {
            $user->update(['role' => User::ROLE_NORMAL_USER]);
        }
    }

    private function assertNotLastOwner(MosqueMember $member): void
    {
        $otherOwners = MosqueMember::query()
            ->where('mosque_id', $member->mosque_id)
            ->where('role', MosqueMember::ROLE_OWNER)
            ->accepted()
            ->whereKeyNot($member->id)
            ->lockForUpdate()
            ->count();

        abort_if($otherOwners === 0, 422, self::LAST_OWNER_MESSAGE);
    }

    private function notifyInvite(MosqueMember $member): void
    {
        $mosque = $member->mosque;
        $inviter = $member->inviter?->name ?? 'A mosque admin';
        $role = MosqueMember::ROLE_LABELS[$member->role] ?? $member->role;

        $this->notifications->notifyUser($member->user_id, $mosque, [
            'type' => Notification::TYPE_TEAM,
            'title' => "Invitation to join {$mosque->name}",
            'message' => "{$inviter} invited you to help run {$mosque->name} as {$role}. Open your profile to accept or decline.",
            'reference_type' => Notification::REFERENCE_MOSQUE_MEMBER,
            'reference_id' => $member->id,
        ]);
    }
}
