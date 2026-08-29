<?php

namespace App\Policies;

use App\Models\Mosque;
use App\Models\User;
use App\Models\VolunteerApplication;
use App\Models\VolunteerOpportunity;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class VolunteerApplicationPolicy
{
    public function view(User $user, VolunteerApplication $application): Response
    {
        if ((int) $application->user_id === (int) $user->id) {
            return Response::allow();
        }

        return Gate::forUser($user)->inspect('update', $application->opportunity->mosque);
    }

    public function update(User $user, VolunteerApplication $application): Response
    {
        return $this->canManage($user, $application->opportunity->mosque);
    }

    public function delete(User $user, VolunteerApplication $application): Response
    {
        return $this->canManage($user, $application->opportunity->mosque);
    }

    public function create(User $user, VolunteerOpportunity $volunteerOpportunity): Response
    {
        if ($user->isSuspended()) {
            return Response::deny('This account is suspended.');
        }

        return Response::allow();
    }

    private function canManage(User $user, Mosque $mosque): Response
    {
        return Gate::forUser($user)->inspect('update', $mosque);
    }
}
