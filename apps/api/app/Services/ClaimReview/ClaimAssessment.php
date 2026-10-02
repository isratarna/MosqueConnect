<?php

namespace App\Services\ClaimReview;

/**
 * Advice about how well a claim document supports the claim. It never decides the claim.
 */
final class ClaimAssessment
{
    public const DOCUMENT_TYPES = ['letterhead', 'committee_resolution', 'nid', 'utility_bill', 'other'];

    /**
     * @param  list<string>  $findings
     * @param  list<string>  $redFlags
     * @param  array<string, mixed>  $usage  Provider details such as pages and characters read.
     */
    public function __construct(
        public readonly float $score,
        public readonly string $documentType,
        public readonly bool $mentionsMosqueName,
        public readonly bool $mentionsApplicantName,
        public readonly array $findings,
        public readonly array $redFlags,
        public readonly string $summary,
        public readonly array $usage = [],
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'score' => $this->score,
            'document_type' => $this->documentType,
            'mentions_mosque_name' => $this->mentionsMosqueName,
            'mentions_applicant_name' => $this->mentionsApplicantName,
            'findings' => $this->findings,
            'red_flags' => $this->redFlags,
            'summary' => $this->summary,
            'usage' => $this->usage,
        ];
    }
}
