<?php

namespace App\Http\Requests;

use App\Models\GoodsDonation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGoodsDonationRequest extends FormRequest
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
        $mosque = $this->route('mosque');

        return [
            // A pledge can answer one of this mosque's own announcements only.
            'announcement_id' => ['nullable', 'integer', Rule::exists('announcements', 'id')->where('mosque_id', $mosque->id)],
            'item_name' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'string', 'max:50'],
            'condition' => ['required', Rule::in(GoodsDonation::CONDITIONS)],
            'delivery_method' => ['required', Rule::in(GoodsDonation::DELIVERY_METHODS)],
            'preferred_date' => ['nullable', 'date', 'after_or_equal:today'],
            'contact' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
