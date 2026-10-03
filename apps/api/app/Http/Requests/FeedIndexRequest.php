<?php

namespace App\Http\Requests;

use App\Services\FeedService;
use Illuminate\Foundation\Http\FormRequest;

class FeedIndexRequest extends FormRequest
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
            'per_page' => ['sometimes', 'nullable', 'integer', 'between:1,'.FeedService::MAX_PER_PAGE],
            'cursor' => ['sometimes', 'nullable', 'string', 'max:512'],
        ];
    }
}
