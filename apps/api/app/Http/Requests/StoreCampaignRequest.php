<?php

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! $this->user()) {
            return false;
        }

        Gate::forUser($this->user())->authorize('create', [Campaign::class, $this->route('mosque')]);

        return true;
    }

    public function rules(): array
    {
        return [
            'mosque_id' => ['prohibited'],
            'created_by' => ['prohibited'],
            'raised_amount' => ['prohibited'],
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['required', 'string', 'max:500'],
            'description' => ['required', 'string', 'max:20000'],
            'category' => ['required', 'string', Rule::in(Campaign::CATEGORIES)],
            'target_amount' => ['required', 'numeric', 'min:1', 'max:999999999999.99', 'decimal:0,2'],
            'currency' => ['sometimes', 'string', Rule::in(['BDT'])],
            'starts_on' => ['required', 'date_format:Y-m-d'],
            'ends_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'image_url' => ['nullable', 'url:http,https', 'max:2048'],
            'status' => ['sometimes', 'string', Rule::in(Campaign::INITIAL_STATUSES)],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || $this->input('status', Campaign::STATUS_DRAFT) !== Campaign::STATUS_ACTIVE) {
                return;
            }

            if ($this->date('ends_on')?->isBefore(today())) {
                $validator->errors()->add('ends_on', 'An active campaign cannot already be expired.');
            }
        }];
    }
}
