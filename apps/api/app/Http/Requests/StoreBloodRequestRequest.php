<?php

namespace App\Http\Requests;

use App\Models\BloodRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBloodRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'blood_group' => ['required', 'string', Rule::in(BloodRequest::BLOOD_GROUPS)],
            'units' => ['nullable', 'integer', 'min:1', 'max:50'],
            'hospital_or_location' => ['required', 'string', 'max:255'],
            'required_date' => ['required', 'date', 'after_or_equal:today'],
            'urgency' => ['sometimes', 'string', Rule::in(BloodRequest::URGENCIES)],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['required', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'status' => ['prohibited'],
            'created_by' => ['prohibited'],
            'closed_at' => ['prohibited'],
        ];
    }
}
