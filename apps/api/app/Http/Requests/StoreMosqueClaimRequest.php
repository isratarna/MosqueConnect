<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMosqueClaimRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'mosque_id' => ['required', 'integer', Rule::exists('mosques', 'id')],
            'document' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'role_at_mosque' => ['required', 'string', 'max:255'],
            'verification_reason' => ['required', 'string', 'max:5000'],
            'user_id' => ['prohibited'],
            'status' => ['prohibited'],
            'reviewer_id' => ['prohibited'],
            'review_note' => ['prohibited'],
            'reviewed_at' => ['prohibited'],
            'submitted_at' => ['prohibited'],
            'document_path' => ['prohibited'],
            'active_claim_key' => ['prohibited'],
            'ai_score' => ['prohibited'],
            'ai_result' => ['prohibited'],
        ];
    }
}
