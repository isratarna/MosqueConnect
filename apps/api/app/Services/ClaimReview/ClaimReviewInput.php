<?php

namespace App\Services\ClaimReview;

use App\Models\VerificationRequest;

/**
 * Everything the reviewer may see. Deliberately no phone numbers or other account data.
 */
final class ClaimReviewInput
{
    public function __construct(
        public readonly string $contents,
        public readonly string $mimeType,
        public readonly string $mosqueName,
        public readonly ?string $mosqueAddress,
        public readonly ?string $mosqueDistrict,
        public readonly ?string $mosqueArea,
        public readonly string $applicantName,
        public readonly ?string $applicantRole,
        public readonly ?string $reason,
    ) {}

    public static function fromClaim(VerificationRequest $claim, string $contents, string $mimeType): self
    {
        return new self(
            contents: $contents,
            mimeType: $mimeType,
            mosqueName: (string) $claim->mosque->name,
            mosqueAddress: $claim->mosque->address,
            mosqueDistrict: $claim->mosque->district,
            mosqueArea: $claim->mosque->area,
            applicantName: (string) $claim->user->name,
            applicantRole: $claim->role_at_mosque,
            reason: $claim->verification_reason,
        );
    }
}
