<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBloodRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'units' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:50'],
            'hospital_or_location' => ['sometimes', 'string', 'max:255'],
            // A requester may push the date back, never bring it into the past.
            'required_date' => ['sometimes', 'date', 'after_or_equal:today'],
            'contact_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'contact_phone' => ['sometimes', 'string', 'max:30', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'blood_group' => ['prohibited'],
            'urgency' => ['prohibited'],
            'status' => ['prohibited'],
            'created_by' => ['prohibited'],
            'closed_at' => ['prohibited'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'hospital_or_location' => 'hospital or location',
        ];
    }

    protected function prepareForValidation(): void
    {
        // "01711 222333" and "+880-1711-222333" are the same number, so the
        // separators are dropped before the Bangladeshi mobile rule runs.
        if ($this->filled('contact_phone')) {
            $this->merge([
                'contact_phone' => preg_replace('/[\s\-()]/', '', (string) $this->input('contact_phone')),
            ]);
        }
    }
}