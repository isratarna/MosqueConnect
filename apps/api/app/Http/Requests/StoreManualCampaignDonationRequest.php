<?php

namespace App\Http\Requests;

use App\Models\Campaign;
use App\Models\CampaignDonation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreManualCampaignDonationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $campaign = $this->route('campaign');

        if (! $this->user() || ! $campaign instanceof Campaign) {
            return false;
        }

        Gate::forUser($this->user())->authorize('update', $campaign);

        return true;
    }

    public function rules(): array
    {
        return [
            'campaign_id' => ['prohibited'],
            'user_id' => ['prohibited'],
            'status' => ['prohibited'],
            'confirmed_by' => ['prohibited'],
            'donor_name' => ['nullable', 'string', 'max:255'],
            'contact' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:1', 'max:999999999999.99', 'decimal:0,2'],
            'payment_method' => ['required', 'string', Rule::in(CampaignDonation::PAYMENT_METHODS)],
            'reference' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:2000'],
            'is_anonymous' => ['sometimes', 'boolean'],
        ];
    }
}
