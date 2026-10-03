<?php

namespace App\Http\Requests;

use App\Models\MosqueFacility;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class MosqueIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('per_page')) {
            $this->merge(['per_page' => 12]);
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'facilities' => ['sometimes', 'array'],
            'facilities.*' => ['required', 'string', 'distinct', Rule::in(MosqueFacility::KEYS)],
            'district' => ['sometimes', 'nullable', 'string', 'max:100'],
            'area' => ['sometimes', 'nullable', 'string', 'max:100'],
            'verified' => ['sometimes', 'boolean'],
            'lat' => ['sometimes', 'nullable', 'numeric', 'between:-90,90', 'required_with:lng'],
            'lng' => ['sometimes', 'nullable', 'numeric', 'between:-180,180', 'required_with:lat'],
            'bounds' => ['sometimes', 'nullable', 'string', function (string $attribute, mixed $value, \Closure $fail): void {
                $parts = array_map('trim', explode(',', (string) $value));
                if (count($parts) !== 4 || count(array_filter($parts, 'is_numeric')) !== 4) {
                    $fail('The bounds must contain south, west, north, and east numeric values.');

                    return;
                }

                [$south, $west, $north, $east] = array_map('floatval', $parts);
                if ($south < -90 || $north > 90 || $west < -180 || $east > 180 || $south > $north || $west > $east) {
                    $fail('The bounds coordinates are invalid.');
                }
            }],
            'sort' => ['sometimes', 'nullable', 'string', Rule::in(['distance', 'name', 'rating'])],
            'per_page' => ['sometimes', 'integer', 'between:1,50'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->input('sort') === 'distance' && (! $this->filled('lat') || ! $this->filled('lng'))) {
                $validator->errors()->add('sort', 'Distance sorting requires lat and lng.');
            }
        }];
    }
}
