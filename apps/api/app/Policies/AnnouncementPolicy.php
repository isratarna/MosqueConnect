<?php

namespace App\Policies;

use App\Models\Announcement;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class AnnouncementPolicy
{
    public function create(User $user, Mosque $mosque): Response
    {
        return Gate::forUser($user)->inspect('update', $mosque);
    }

    public function view(User $user, Announcement $announcement): Response
    {
        return $this->canManage($user, $announcement->mosque);
    }

    public function update(User $user, Announcement $announcement): Response
    {
        return $this->canManage($user, $announcement->mosque);
    }

    public function delete(User $user, Announcement $announcement): Response
    {
        return $this->canManage($user, $announcement->mosque);
    }

    private function canManage(User $user, Mosque $mosque): Response
    {
        return Gate::forUser($user)->inspect('update', $mosque);
    }
}
