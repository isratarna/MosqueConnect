<?php

namespace App\Services\ClaimReview;

class DocumentAiClaimReviewer implements ClaimDocumentReviewer
{
    public function __construct(
        private readonly GoogleDocumentAiClient $client,
        private readonly ClaimAssessmentScorer $scorer,
    ) {}

    public function review(ClaimReviewInput $input): ClaimAssessment
    {
        $ocr = $this->client->process($input->contents, $input->mimeType);

        return $this->scorer->assess($input, $ocr['text'], $ocr['confidence'], [
            'provider' => 'google_document_ai',
            'pages' => $ocr['pages'],
        ]);
    }
}
