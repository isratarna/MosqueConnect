<?php

namespace App\Policies;

use App\Models\BloodRequest;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class BloodRequestPolicy
{
    /**
     * Only the creator or a super admin may change a request's status.
     */
    public function updateStatus(User $user, BloodRequest $bloodRequest): Response
    {
        if ($user->isSuperAdmin()) {
            return Response::allow();
        }

        if ((int) $bloodRequest->created_by === (int) $user->id) {
            return Response::allow();
        }

        return Response::deny('You do not have permission to update this blood request.');
    }
}
