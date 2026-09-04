<?php

namespace App\Policies;

use App\Models\Mosque;
use App\Models\User;
use App\Models\VolunteerOpportunity;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class VolunteerOpportunityPolicy
{
    public function create(User $user, Mosque $mosque): Response
    {
        return Gate::forUser($user)->inspect('update', $mosque);
    }

    public function view(User $user, VolunteerOpportunity $volunteerOpportunity): Response
    {
        return $this->canManage($user, $volunteerOpportunity->mosque);
    }

    public function update(User $user, VolunteerOpportunity $volunteerOpportunity): Response
    {
        return $this->canManage($user, $volunteerOpportunity->mosque);
    }

    public function delete(User $user, VolunteerOpportunity $volunteerOpportunity): Response
    {
        return $this->canManage($user, $volunteerOpportunity->mosque);
    }

    private function canManage(User $user, Mosque $mosque): Response
    {
        return Gate::forUser($user)->inspect('update', $mosque);
    }
}
