<?php

namespace App\Http\Requests;

use App\Models\Event;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EventIndexRequest extends FormRequest
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
            'category' => ['sometimes', 'nullable', 'string', Rule::in(Event::CATEGORIES)],
            'mosque_id' => ['sometimes', 'nullable', 'integer', 'exists:mosques,id'],
            'date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'status' => ['sometimes', 'nullable', 'string', Rule::in(Event::STATUSES)],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'page' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'nullable', 'integer', 'between:1,100'],
        ];
    }
}
