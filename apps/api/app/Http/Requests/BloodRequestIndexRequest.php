<?php

namespace App\Http\Requests;

use App\Models\BloodRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BloodRequestIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'blood_group' => ['sometimes', 'nullable', 'string', Rule::in(BloodRequest::BLOOD_GROUPS)],
            'urgency' => ['sometimes', 'nullable', 'string', Rule::in(BloodRequest::URGENCIES)],
            'area' => ['sometimes', 'nullable', 'string', 'max:255'],
            'needed_before' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'page' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'nullable', 'integer', 'between:1,50'],
        ];
    }
}