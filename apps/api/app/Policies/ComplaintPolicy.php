<?php

namespace App\Policies;

use App\Models\Complaint;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

/**
 * Complaints are private: the author, the mosque's admins (owner or manager)
 * and the super admin may read them. Nobody else, not even other mosques' admins.
 */
class ComplaintPolicy
{
    /** Open the mosque's complaints inbox. */
    public function viewAny(User $user, Mosque $mosque): Response
    {
        return Gate::forUser($user)->inspect('update', $mosque);
    }

    public function view(User $user, Complaint $complaint): Response
    {
        if ((int) $complaint->user_id === (int) $user->id) {
            return Response::allow();
        }

        return $this->respond($user, $complaint);
    }

    /** Change the status and write a response. */
    public function respond(User $user, Complaint $complaint): Response
    {
        return Gate::forUser($user)->inspect('update', $complaint->mosque);
    }
}
