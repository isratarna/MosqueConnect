<?php

namespace App\Services\ClaimReview;

interface ClaimDocumentReviewer
{
    /**
     * @throws ClaimReviewException When the review service fails.
     */
    public function review(ClaimReviewInput $input): ClaimAssessment;
}
