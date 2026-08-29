<?php

namespace App\Services;

use App\Models\Mosque;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\VerificationRequest;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MosqueClaimService
{
    public const CLAIMS_DISABLED_MESSAGE = 'Mosque claims are temporarily unavailable.';

    public const DUPLICATE_PENDING_MESSAGE = 'You already have a pending claim for this mosque.';

    /**
     * Determine whether the given user is eligible to submit a mosque claim.
     */
    public function isEligible(User $user): bool
    {
        return $user->isNormalUser() && $user->ownedMosques()->doesntExist();
    }

    /**
     * Assert the mosque can be claimed.
     *
     * A mosque cannot be claimed when it is already owned/claimed by an admin.
     *
     * @throws HttpException
     */
    public function assertClaimable(Mosque $mosque): void
    {
        abort_if($mosque->owner_id !== null, 409, 'This mosque has already been claimed by an administrator.');
    }

    /**
     * Assert the user does not already have an open (pending) claim for the mosque.
     *
     * @throws HttpException
     */
    public function assertNoDuplicatePending(User $user, Mosque $mosque): void
    {
        $hasOpenClaim = VerificationRequest::query()
            ->where('user_id', $user->id)
            ->where('mosque_id', $mosque->id)
            ->whereNotIn('status', [
                VerificationRequest::STATUS_APPROVED,
                VerificationRequest::STATUS_REJECTED,
            ])
            ->exists();

        abort_if($hasOpenClaim, 409, self::DUPLICATE_PENDING_MESSAGE);
    }

    /**
     * Persist a submitted mosque claim and return the created request.
     */
    public function create(User $user, Mosque $mosque, array $data): VerificationRequest
    {
        $this->assertClaimsEnabled();

        abort_unless($this->isEligible($user), 403, 'Only users without an assigned mosque can submit a claim.');

        $this->assertClaimable($mosque);

        $this->assertNoDuplicatePending($user, $mosque);

        $documentPath = $data['document']->store('verification', 'local');

        try {
            return VerificationRequest::query()->create([
                'user_id' => $user->id,
                'mosque_id' => $mosque->id,
                'document_path' => $documentPath,
                'role_at_mosque' => $data['role_at_mosque'],
                'verification_reason' => $data['verification_reason'],
                'status' => VerificationRequest::STATUS_PENDING,
                'submitted_at' => now(),
            ]);
        } catch (QueryException $e) {
            if (! $this->isActiveClaimKeyViolation($e)) {
                throw $e;
            }

            Storage::disk('local')->delete($documentPath);

            abort(409, self::DUPLICATE_PENDING_MESSAGE);
        }
    }

    /**
     * Whether the given query exception came from the unique active-claim
     * constraint, i.e. a concurrent request created the same open claim first.
     */
    private function isActiveClaimKeyViolation(QueryException $e): bool
    {
        if ($e->getCode() !== '23000') {
            return false;
        }

        return $e->errorInfo[1] === 1062 || str_contains($e->getMessage(), 'UNIQUE constraint failed');
    }

    /**
     * Throws if mosque claims have been disabled by a super admin.
     *
     * @throws HttpException
     */
    public function assertClaimsEnabled(): void
    {
        $enabled = SystemSetting::query()->find('claims_enabled')?->value ?? true;

        abort_unless($enabled, 503, self::CLAIMS_DISABLED_MESSAGE);
    }
}
