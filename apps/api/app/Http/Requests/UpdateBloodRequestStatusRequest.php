<?php

namespace App\Http\Requests;

use App\Models\BloodRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBloodRequestStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(BloodRequest::STATUSES)],
        ];
    }
}
