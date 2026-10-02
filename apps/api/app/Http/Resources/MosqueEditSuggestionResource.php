<?php

namespace App\Http\Resources;

use App\Models\MosqueEditSuggestion;
use App\Services\MosqueSuggestionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A suggested correction. For pending suggestions, `current` is the mosque's
 * value right now; `before` is what it was when the suggestion was made.
 *
 * @property MosqueEditSuggestion $resource
 */
class MosqueEditSuggestionResource extends JsonResource
{
    /**
     * @param  array<string, mixed>|null  $current
     */
    public function __construct($resource, private readonly ?array $current = null, private readonly ?bool $canReview = null)
    {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $suggestion = $this->resource;

        $payload = [
            'id' => $suggestion->id,
            'mosque_id' => $suggestion->mosque_id,
            'field' => $suggestion->field,
            'field_label' => MosqueSuggestionService::FIELD_LABELS[$suggestion->field] ?? $suggestion->field,
            'payload' => $suggestion->payload,
            'before' => $suggestion->before,
            'note' => $suggestion->note,
            'status' => $suggestion->status,
            'review_note' => $suggestion->review_note,
            'reviewed_at' => $suggestion->reviewed_at?->toJSON(),
            'auto_accepted' => $suggestion->status === MosqueEditSuggestion::STATUS_ACCEPTED && $suggestion->reviewed_by === null,
            'created_at' => $suggestion->created_at?->toJSON(),
            'mosque' => $this->whenLoaded('mosque', fn (): array => [
                'id' => $suggestion->mosque->id,
                'name' => $suggestion->mosque->name,
                'address' => $suggestion->mosque->address,
                'verification_status' => $suggestion->mosque->verification_status,
            ]),
            'user' => $this->whenLoaded('user', fn (): ?array => $suggestion->user ? [
                'id' => $suggestion->user->id,
                'name' => $suggestion->user->name,
                'accepted_suggestions_count' => (int) $suggestion->user->accepted_suggestions_count,
                'trusted_contributor' => $suggestion->user->isTrustedContributor(),
            ] : null),
            'reviewer' => $this->whenLoaded('reviewer', fn (): ?array => $suggestion->reviewer ? [
                'id' => $suggestion->reviewer->id,
                'name' => $suggestion->reviewer->name,
            ] : null),
        ];

        if ($this->current !== null || $suggestion->isPending()) {
            $payload['current'] = $this->current;
        }

        if ($this->canReview !== null) {
            $payload['can_review'] = $this->canReview;
        }

        return $payload;
    }
}
