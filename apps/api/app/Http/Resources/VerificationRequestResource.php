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
            'status' => $this->status,
            'status_label' => $this->publicStatus(),
            'mosque' => $this->whenLoaded('mosque', fn () => [
                'id' => $this->mosque->id,
                'name' => $this->mosque->name,
                'address' => $this->mosque->address,
                'verification_status' => $this->mosque->verification_status,
            ]),
            'document_path' => $this->document_path,
            'role_at_mosque' => $this->role_at_mosque,
            'verification_reason' => $this->verification_reason,
            'rejection_reason' => $this->status === VerificationRequest::STATUS_REJECTED
                ? $this->review_note
                : null,
            'reviewer_note' => $this->when($this->status !== VerificationRequest::STATUS_REJECTED, $this->review_note),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
