<?php

namespace App\Jobs;

use App\Models\VerificationRequest;
use App\Services\ClaimReview\ClaimDocumentReviewer;
use App\Services\ClaimReview\ClaimReviewException;
use App\Services\ClaimReview\ClaimReviewInput;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Reads a claim document and stores advice (score, findings, red flags) on
 * the claim. It never approves or rejects, and a failure never blocks the claim.
 */
class PrescreenClaimDocument implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [30, 120];

    public int $timeout = 120;

    public const MIME_TYPES = [
        'pdf' => 'application/pdf',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
    ];

    public function __construct(public VerificationRequest $claim) {}

    public function handle(ClaimDocumentReviewer $reviewer): void
    {
        $claim = $this->claim->fresh(['mosque', 'user']);

        if (! $claim || $claim->isFinalized()) {
            return;
        }

        $disk = Storage::disk('local');
        $mimeType = self::MIME_TYPES[strtolower(pathinfo($claim->document_path, PATHINFO_EXTENSION))] ?? null;

        if (! $disk->exists($claim->document_path) || $mimeType === null) {
            $this->recordError($claim, 'unsupported_document', 'The document is missing or is not a PDF, JPG or PNG.');

            return;
        }

        try {
            $assessment = $reviewer->review(ClaimReviewInput::fromClaim($claim, $disk->get($claim->document_path), $mimeType));
        } catch (ClaimReviewException $e) {
            if ($e->isRetryable() && $this->attempts() < $this->tries) {
                throw $e;
            }

            $this->recordError($claim, 'review_failed', $e->getMessage(), $e->status);

            return;
        }

        $this->store($claim->id, [
            'ai_score' => $assessment->score,
            'ai_result' => [...$assessment->toArray(), 'reviewed_at' => now()->toJSON()],
        ], markReviewed: true);
    }

    public function failed(?Throwable $exception): void
    {
        $this->recordError($this->claim, 'review_failed', $exception?->getMessage() ?? 'Unknown error');
    }

    private function recordError(VerificationRequest $claim, string $error, string $message, ?int $status = null): void
    {
        $this->store($claim->id, [
            'ai_result' => array_filter([
                'error' => $error,
                'message' => mb_substr($message, 0, 500),
                'status' => $status,
                'reviewed_at' => now()->toJSON(),
            ], fn ($value) => $value !== null),
        ], markReviewed: false);
    }

    /**
     * Write the result only to a claim that is still undecided, so a super
     * admin's decision is never overwritten.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function store(int $claimId, array $attributes, bool $markReviewed): void
    {
        if (array_key_exists('ai_result', $attributes)) {
            $attributes['ai_result'] = json_encode($attributes['ai_result']);
        }

        $attributes['updated_at'] = now();
        $query = fn () => VerificationRequest::query()->whereKey($claimId);

        // Conditional updates, so a decision made while the review ran wins.
        if ($markReviewed && $query()->where('status', VerificationRequest::STATUS_PENDING)
            ->update([...$attributes, 'status' => VerificationRequest::STATUS_AI_REVIEWED]) > 0) {
            return;
        }

        $query()->whereIn('status', VerificationRequest::ACTIVE_STATUSES)->update($attributes);
    }
}
