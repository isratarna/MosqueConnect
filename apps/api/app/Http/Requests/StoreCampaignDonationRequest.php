<?php

namespace App\Http\Requests;

use App\Models\Campaign;
use App\Models\CampaignDonation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreCampaignDonationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $campaign = $this->route('campaign');

        return $this->user() !== null
            && $campaign instanceof Campaign
            && $campaign->acceptsDonations();
    }

    public function rules(): array
    {
        return [
            'campaign_id' => ['prohibited'],
            'user_id' => ['prohibited'],
            'status' => ['prohibited'],
            'confirmed_by' => ['prohibited'],
            'donor_name' => ['nullable', 'string', 'max:255'],
            'contact' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:1', 'max:999999999999.99', 'decimal:0,2'],
            'payment_method' => ['required', 'string', Rule::in(CampaignDonation::PAYMENT_METHODS)],
            'reference' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:2000'],
            'is_anonymous' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if (! $this->boolean('is_anonymous') && blank($this->input('donor_name'))) {
                $validator->errors()->add('donor_name', 'The donor name is required unless donating anonymously.');
            }
        }];
    }
}
