<?php

namespace App\Policies;

use App\Models\Mosque;
use App\Models\User;
use App\Support\MosqueAbility;
use Illuminate\Auth\Access\Response;

/**
 * Mosque permissions by team role. The role table itself is in MosqueAbility.
 */
class MosquePolicy
{
    /** Open the dashboard and see the team. */
    public function view(User $user, Mosque $mosque): Response
    {
        return MosqueAbility::check($user, $mosque, MosqueAbility::VIEW);
    }

    /** Edit the mosque profile, photo and facilities. */
    public function update(User $user, Mosque $mosque): Response
    {
        return MosqueAbility::check($user, $mosque, MosqueAbility::SETTINGS);
    }

    /** Announcements, events, volunteering, campaigns and insights. */
    public function manageContent(User $user, Mosque $mosque): Response
    {
        return MosqueAbility::check($user, $mosque, MosqueAbility::CONTENT);
    }

    /** Daily prayer times, Jumuah and Eid jamaats. */
    public function managePrayerTimes(User $user, Mosque $mosque): Response
    {
        return MosqueAbility::check($user, $mosque, MosqueAbility::PRAYER_TIMES);
    }

    /** Invite people and cancel invitations. */
    public function manageTeam(User $user, Mosque $mosque): Response
    {
        return MosqueAbility::check($user, $mosque, MosqueAbility::TEAM);
    }

    /** Change a member's role or remove a member. */
    public function manageMembers(User $user, Mosque $mosque): Response
    {
        return MosqueAbility::check($user, $mosque, MosqueAbility::MEMBERS);
    }

    /** See the suggested-corrections queue: anyone who could apply one of them. */
    public function reviewSuggestions(User $user, Mosque $mosque): Response
    {
        $prayerTimes = MosqueAbility::check($user, $mosque, MosqueAbility::PRAYER_TIMES);

        return $prayerTimes->allowed() ? $prayerTimes : MosqueAbility::check($user, $mosque, MosqueAbility::SETTINGS);
    }
}
