<?php

namespace App\Policies;

use App\Models\Mosque;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class MosquePolicy
{
    public function view(User $user, Mosque $mosque): Response
    {
        return $this->canManage($user, $mosque);
    }

    public function update(User $user, Mosque $mosque): Response
    {
        return $this->canManage($user, $mosque);
    }

    private function canManage(User $user, Mosque $mosque): Response
    {
        if ($user->isSuperAdmin()) {
            return Response::allow();
        }

        if (! $user->isMosqueAdmin()) {
            return Response::deny('Forbidden.');
        }

        if ((int) $mosque->owner_id !== (int) $user->id) {
            return Response::deny('Forbidden.');
        }

        if (! $mosque->isVerified()) {
            return Response::deny('Mosque administration is not available until the mosque is verified.');
        }

        return Response::allow();
    }
}
