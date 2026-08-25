<?php

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        $campaign = $this->route('campaign');
        $mosque = $this->route('mosque');

        if (! $this->user() || ! $campaign instanceof Campaign || (int) $campaign->mosque_id !== (int) $mosque?->id) {
            return false;
        }

        Gate::forUser($this->user())->authorize('update', $campaign);

        return true;
    }

    public function rules(): array
    {
        return [
            'mosque_id' => ['prohibited'],
            'created_by' => ['prohibited'],
            'raised_amount' => ['prohibited'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'summary' => ['sometimes', 'required', 'string', 'max:500'],
            'description' => ['sometimes', 'required', 'string', 'max:20000'],
            'category' => ['sometimes', 'required', 'string', Rule::in(Campaign::CATEGORIES)],
            'target_amount' => ['sometimes', 'required', 'numeric', 'min:1', 'max:999999999999.99', 'decimal:0,2'],
            'currency' => ['sometimes', 'required', 'string', Rule::in(['BDT'])],
            'starts_on' => ['sometimes', 'required', 'date_format:Y-m-d'],
            'ends_on' => ['sometimes', 'required', 'date_format:Y-m-d'],
            'image_url' => ['sometimes', 'nullable', 'url:http,https', 'max:2048'],
            'status' => ['sometimes', 'required', 'string', Rule::in(Campaign::STATUSES)],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var Campaign $campaign */
            $campaign = $this->route('campaign');
            $startsOn = $this->date('starts_on') ?? $campaign->starts_on;
            $endsOn = $this->date('ends_on') ?? $campaign->ends_on;
            $status = $this->input('status', $campaign->status);
            $target = (float) $this->input('target_amount', $campaign->target_amount);

            if ($endsOn->isBefore($startsOn)) {
                $validator->errors()->add('ends_on', 'The end date must be on or after the start date.');
            }
            if ($status === Campaign::STATUS_ACTIVE && $endsOn->isBefore(today())) {
                $validator->errors()->add('ends_on', 'An active campaign cannot already be expired.');
            }
            if ($status === Campaign::STATUS_EXPIRED && ! $endsOn->isBefore(today())) {
                $validator->errors()->add('status', 'A campaign can only expire after its end date.');
            }
            if ($target < (float) $campaign->raised_amount) {
                $validator->errors()->add('target_amount', 'The target amount cannot be less than the confirmed amount raised.');
            }
            if ($this->has('status') && ! $campaign->canTransitionTo((string) $status)) {
                $validator->errors()->add('status', "The campaign status cannot transition from {$campaign->status} to {$status}.");
            }
        }];
    }
}
