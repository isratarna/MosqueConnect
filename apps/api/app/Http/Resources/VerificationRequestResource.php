<?php

namespace App\Http\Resources;

use App\Models\VerificationRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin VerificationRequest
 */
class VerificationRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'mosque_id' => $this->mosque_id,
            'status' => $this->status,
            'status_label' => $this->publicStatus(),
            'mosque' => $this->whenLoaded('mosque', fn () => [
                'id' => $this->mosque->id,
                'name' => $this->mosque->name,
                'address' => $this->mosque->address,
                'phone' => $this->mosque->phone,
                'verification_status' => $this->mosque->verification_status,
            ]),
            'document_path' => $this->document_path,
            'role_at_mosque' => $this->role_at_mosque,
            'verification_reason' => $this->verification_reason,
            'ai_score' => $this->ai_score !== null ? (float) $this->ai_score : null,
            'ai_result' => $this->ai_result,
            'rejection_reason' => $this->status === VerificationRequest::STATUS_REJECTED
                ? $this->review_note
                : null,
            'reviewer_note' => $this->when($this->status !== VerificationRequest::STATUS_REJECTED, $this->review_note),
            'review_note' => $this->review_note,
            'submitted_at' => $this->submitted_at?->toISO8601String(),
            'reviewed_at' => $this->reviewed_at?->toISO8601String(),
            'created_at' => $this->created_at?->toISO8601String(),
            'updated_at' => $this->updated_at?->toISO8601String(),
        ];
    }
}
