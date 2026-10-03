<?php

namespace App\Http\Requests;

use App\Models\Event;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! $this->user()) {
            return false;
        }

        Gate::forUser($this->user())->authorize('create', [Event::class, $this->route('mosque')]);

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'mosque_id' => ['prohibited'],
            'created_by' => ['prohibited'],
            'participant_count' => ['prohibited'],
            'participants_count' => ['prohibited'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'category' => ['required', 'string', Rule::in(Event::CATEGORIES)],
            'event_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'recurrence_rule' => ['nullable', 'string', 'max:255', 'regex:/^FREQ=(DAILY|WEEKLY|MONTHLY)(;INTERVAL=[1-9][0-9]?)?(;BYDAY=(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*)?(;UNTIL=[0-9]{8})?$/i'],
            'recurrence_until' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:event_date'],
            'location' => ['required', 'string', 'max:255'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'registration_required' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'string', Rule::in(Event::INITIAL_STATUSES)],
        ];
    }

    /** @return array<int, callable> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $start = CarbonImmutable::parse($this->input('event_date'));
            $maxEnd = $start->addYear();
            $recurrenceUntil = $this->input('recurrence_until');
            try {
                $ruleUntil = $this->input('recurrence_rule') ? $this->ruleUntil($this->input('recurrence_rule')) : null;
            } catch (\InvalidArgumentException) {
                $validator->errors()->add('recurrence_rule', 'The RRULE UNTIL value must be a valid calendar date.');

                return;
            }

            foreach ([$recurrenceUntil, $ruleUntil] as $until) {
                if ($until && CarbonImmutable::parse($until)->gt($maxEnd)) {
                    $validator->errors()->add('recurrence_until', 'The recurrence end date cannot be more than one year after the event date.');
                    break;
                }
            }
        }];
    }

    private function ruleUntil(string $rule): ?string
    {
        foreach (explode(';', $rule) as $part) {
            if (str_starts_with(strtoupper($part), 'UNTIL=')) {
                try {
                    $value = substr($part, 6);
                    $date = CarbonImmutable::createFromFormat('!Ymd', $value);
                    if (! $date || $date->format('Ymd') !== $value) {
                        throw new \InvalidArgumentException('Invalid RRULE end date.');
                    }

                    return $date->toDateString();
                } catch (\Throwable) {
                    throw new \InvalidArgumentException('Invalid RRULE end date.');
                }
            }
        }

        return null;
    }
}
