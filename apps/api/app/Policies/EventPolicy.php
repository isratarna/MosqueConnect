<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class EventPolicy
{
    public function create(User $user, Mosque $mosque): Response
    {
        return Gate::forUser($user)->inspect('update', $mosque);
    }

    public function view(User $user, Event $event): Response
    {
        return $this->canManage($user, $event);
    }

    public function update(User $user, Event $event): Response
    {
        return $this->canManage($user, $event);
    }

    public function delete(User $user, Event $event): Response
    {
        return $this->canManage($user, $event);
    }

    private function canManage(User $user, Event $event): Response
    {
        return Gate::forUser($user)->inspect('update', $event->mosque);
    }
}
