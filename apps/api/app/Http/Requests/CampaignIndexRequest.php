<?php

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CampaignIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', Rule::in(Campaign::CATEGORIES)],
            'mosque_id' => ['nullable', 'integer', 'exists:mosques,id'],
            'status' => ['nullable', 'string', Rule::in([
                Campaign::STATUS_ACTIVE,
                Campaign::STATUS_COMPLETED,
                Campaign::STATUS_CANCELLED,
                Campaign::STATUS_EXPIRED,
            ])],
            'sort' => ['nullable', 'string', Rule::in(['ending_soon', 'newest', 'most_funded', 'almost_there'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
