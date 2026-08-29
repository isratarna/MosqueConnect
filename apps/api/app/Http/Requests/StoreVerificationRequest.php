<?php

namespace App\Http\Requests;

use App\Models\VerificationRequest;
use Illuminate\Foundation\Http\FormRequest;

class StoreVerificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'mosque_id' => ['required', 'integer', 'exists:mosques,id'],
            'proof_document' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'max:5120',
            ],
        ];
    }

    /**
     * Ensure a user or mosque does not already have an in-flight request.
     */
    public function hasActiveConflict(): bool
    {
        return VerificationRequest::query()
            ->whereIn('status', VerificationRequest::ACTIVE_STATUSES)
            ->where(fn ($query) => $query
                ->where('user_id', $this->user()->id)
                ->orWhere('mosque_id', $this->input('mosque_id')))
            ->exists();
    }
}
