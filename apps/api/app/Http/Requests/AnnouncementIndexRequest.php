<?php

namespace App\Http\Requests;

use App\Models\Announcement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AnnouncementIndexRequest extends FormRequest
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
            'mosque_id' => ['sometimes', 'nullable', 'integer', 'exists:mosques,id'],
            'urgency' => ['sometimes', 'nullable', 'string', Rule::in(Announcement::URGENCIES)],
            'category' => ['sometimes', 'nullable', 'string', Rule::in(Announcement::CATEGORIES)],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'since' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'district' => ['sometimes', 'nullable', 'string', 'max:100'],
            'area' => ['sometimes', 'nullable', 'string', 'max:100'],
            'page' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'nullable', 'integer', 'between:1,50'],
        ];
    }
}
