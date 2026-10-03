<?php

namespace App\Http\Requests;

use App\Models\Event;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'status' => ['sometimes', 'nullable', 'string', Rule::in(Event::STATUSES)],
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'page' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'nullable', 'integer', 'between:1,100'],
        ];
    }

    /** @return array<int, callable> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $from = CarbonImmutable::parse($this->input('from', today()->toDateString()));
            $to = CarbonImmutable::parse($this->input('to', $from->addMonths(6)->toDateString()));
            if ($to->lt($from)) {
                $validator->errors()->add('to', 'The end date must be on or after the start date.');
            } elseif ($to->gt($from->addMonths(6))) {
                $validator->errors()->add('to', 'The event date window cannot exceed six months.');
            }
        }];
    }
}
