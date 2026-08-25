<?php

namespace App\Policies;

use App\Models\Campaign;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class CampaignPolicy
{
    public function create(User $user, Mosque $mosque): Response
    {
        return Gate::forUser($user)->inspect('update', $mosque);
    }

    public function view(User $user, Campaign $campaign): Response
    {
        return $this->canManage($user, $campaign);
    }

    public function update(User $user, Campaign $campaign): Response
    {
        return $this->canManage($user, $campaign);
    }

    public function delete(User $user, Campaign $campaign): Response
    {
        return $this->canManage($user, $campaign);
    }

    private function canManage(User $user, Campaign $campaign): Response
    {
        return Gate::forUser($user)->inspect('update', $campaign->mosque);
    }
}
