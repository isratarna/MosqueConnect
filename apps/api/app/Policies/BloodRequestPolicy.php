<?php

namespace App\Policies;

use App\Models\BloodRequest;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class BloodRequestPolicy
{
    /**
     * Only the creator may correct the details of their own request.
     */
    public function update(User $user, BloodRequest $bloodRequest): Response
    {
        if ((int) $bloodRequest->created_by === (int) $user->id) {
            return Response::allow();
        }

        return Response::deny('You do not have permission to edit this blood request.');
    }

    /**
     * The donors who offered to help carry a phone number, so the list of
     * responses is only revealed to the requester and to a super admin.
     */
    public function viewResponses(User $user, BloodRequest $bloodRequest): Response
    {
        if ($user->isSuperAdmin()) {
            return Response::allow();
        }

        if ((int) $bloodRequest->created_by === (int) $user->id) {
            return Response::allow();
        }

        return Response::deny('You do not have permission to see who responded to this blood request.');
    }

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
