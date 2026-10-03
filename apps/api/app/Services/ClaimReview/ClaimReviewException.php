<?php

namespace App\Services\ClaimReview;

use RuntimeException;

class ClaimReviewException extends RuntimeException
{
    public function __construct(string $message, public readonly ?int $status = null)
    {
        parent::__construct($message);
    }

    /** Rate limits, server errors and network failures are worth another try. */
    public function isRetryable(): bool
    {
        return $this->status === null || $this->status === 429 || $this->status >= 500;
    }
}
