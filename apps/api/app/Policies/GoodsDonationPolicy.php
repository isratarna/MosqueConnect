<?php

namespace App\Policies;

use App\Models\GoodsDonation;
use App\Models\Mosque;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

/**
 * Only the mosque's own admin (or the super admin) can manage its goods pledges.
 */
class GoodsDonationPolicy
{
    public function viewAny(User $user, Mosque $mosque): Response
    {
        return Gate::forUser($user)->inspect('manageContent', $mosque);
    }

    public function update(User $user, GoodsDonation $donation): Response
    {
        return Gate::forUser($user)->inspect('manageContent', $donation->mosque);
    }
}
