<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBloodRequestResponseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'message' => ['nullable', 'string', 'max:5000'],
            'blood_request_id' => ['prohibited'],
            'user_id' => ['prohibited'],
        ];
    }
}
