<?php

namespace App\Support;

use App\Models\Mosque;
use App\Models\MosqueEditSuggestion;
use App\Models\MosqueMember;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * What each mosque team role may do. Every mosque permission check goes
 * through here (via MosquePolicy), so the role table lives in one place.
 *
 *   owner        everything, including changing or removing team members
 *   manager      everything except changing or removing team members
 *   editor       announcements, events, volunteering and campaigns
 *   prayer_times the prayer schedule (daily, Jumuah and Eid) only
 */
final class MosqueAbility
{
    /** Open the dashboard and see the team. */
    public const VIEW = 'view';

    /** Announcements, events, volunteering, campaigns and insights. */
    public const CONTENT = 'content';

    /** Daily prayer times, Jumuah and Eid jamaats. */
    public const PRAYER_TIMES = 'prayer_times';

    /** Mosque profile, photo and facilities. */
    public const SETTINGS = 'settings';

    /** Invite people and cancel invitations. */
    public const TEAM = 'team';

    /** Change a member's role or remove a member. */
    public const MEMBERS = 'members';

    public const ABILITIES = [
        self::VIEW,
        self::CONTENT,
        self::PRAYER_TIMES,
        self::SETTINGS,
        self::TEAM,
        self::MEMBERS,
    ];

    /** @var array<string, list<string>> */
    private const ROLE_ABILITIES = [
        MosqueMember::ROLE_OWNER => self::ABILITIES,
        MosqueMember::ROLE_MANAGER => [self::VIEW, self::CONTENT, self::PRAYER_TIMES, self::SETTINGS, self::TEAM],
        MosqueMember::ROLE_EDITOR => [self::VIEW, self::CONTENT],
        MosqueMember::ROLE_PRAYER_TIMES => [self::VIEW, self::PRAYER_TIMES],
    ];

    /**
     * @return list<string>
     */
    public static function forRole(?string $role): array
    {
        return self::ROLE_ABILITIES[$role] ?? [];
    }

    public static function roleAllows(?string $role, string $ability): bool
    {
        return in_array($ability, self::forRole($role), true);
    }

    /**
     * The user's accepted role on the mosque's team, if any.
     */
    public static function roleOf(User $user, Mosque $mosque): ?string
    {
        return MosqueMember::query()
            ->where('mosque_id', $mosque->id)
            ->where('user_id', $user->id)
            ->accepted()
            ->value('role');
    }

    public static function allows(User $user, Mosque $mosque, string $ability): bool
    {
        return self::check($user, $mosque, $ability)->allowed();
    }

    /**
     * Decide whether the user may use an ability on the mosque.
     */
    public static function check(User $user, Mosque $mosque, string $ability): Response
    {
        if ($user->isSuperAdmin()) {
            return Response::allow();
        }

        if (! $user->isMosqueAdmin()) {
            return Response::deny('Forbidden.');
        }

        $role = self::roleOf($user, $mosque);

        if ($role === null) {
            return Response::deny('Forbidden.');
        }

        if (! $mosque->isVerified()) {
            return Response::deny('Mosque administration is not available until the mosque is verified.');
        }

        if (! self::roleAllows($role, $ability)) {
            return Response::deny('Your team role does not allow this.');
        }

        return Response::allow();
    }

    /**
     * The ability needed to review a suggested correction to the given field.
     */
    public static function forSuggestionField(string $field): string
    {
        return in_array($field, MosqueEditSuggestion::TIME_FIELDS, true) ? self::PRAYER_TIMES : self::SETTINGS;
    }
}
