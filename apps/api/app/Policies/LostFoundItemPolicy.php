<?php

namespace App\Policies;

use App\Models\LostFoundItem;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class LostFoundItemPolicy
{
    /** Only the person who posted the item may edit it. */
    public function update(User $user, LostFoundItem $item): Response
    {
        return (int) $item->user_id === (int) $user->id
            ? Response::allow()
            : Response::deny('Only the person who posted this item can edit it.');
    }

    /** The poster, the admin of the mosque it was posted at, or the super admin. */
    public function updateStatus(User $user, LostFoundItem $item): Response
    {
        if ((int) $item->user_id === (int) $user->id || $user->isSuperAdmin()) {
            return Response::allow();
        }

        if ($item->mosque && Gate::forUser($user)->allows('manageContent', $item->mosque)) {
            return Response::allow();
        }

        return Response::deny('You do not have permission to change the status of this item.');
    }
}
