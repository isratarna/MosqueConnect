<?php

namespace App\Http\Requests;

use App\Models\Event;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        $event = $this->route('event');
        $mosque = $this->route('mosque');

        if (! $this->user() || ! $event instanceof Event || (int) $event->mosque_id !== (int) $mosque?->id) {
            return false;
        }

        Gate::forUser($this->user())->authorize('update', $event);

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
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'category' => ['sometimes', 'required', 'string', Rule::in(Event::CATEGORIES)],
            'event_date' => ['sometimes', 'required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'start_time' => ['sometimes', 'required', 'date_format:H:i'],
            'end_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'recurrence_rule' => ['sometimes', 'nullable', 'string', 'max:255', 'regex:/^FREQ=(DAILY|WEEKLY|MONTHLY)(;INTERVAL=[1-9][0-9]?)?(;BYDAY=(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*)?(;UNTIL=[0-9]{8})?$/i'],
            'recurrence_until' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'location' => ['sometimes', 'required', 'string', 'max:255'],
            'capacity' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'registration_required' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'required', 'string', Rule::in(Event::STATUSES)],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                /** @var Event $event */
                $event = $this->route('event');
                $startTime = $this->input('start_time', $event->start_time);
                $endTime = $this->exists('end_time') ? $this->input('end_time') : $event->end_time;

                if ($endTime !== null && $this->timeInMinutes($endTime) <= $this->timeInMinutes($startTime)) {
                    $validator->errors()->add('end_time', 'The end time must be after the start time.');
                }

                if ($this->has('status') && ! $event->canTransitionTo($this->string('status')->toString())) {
                    $validator->errors()->add(
                        'status',
                        "The event status cannot transition from {$event->status} to {$this->input('status')}.",
                    );
                }

                $startDate = CarbonImmutable::parse($this->input('event_date', $event->event_date->toDateString()));
                $rule = $this->input('recurrence_rule', $event->recurrence_rule);
                $untilValues = [$this->input('recurrence_until', $event->recurrence_until?->toDateString())];
                foreach ($untilValues as $until) {
                    if ($until && CarbonImmutable::parse($until)->lt($startDate)) {
                        $validator->errors()->add('recurrence_until', 'The recurrence end date must be on or after the event date.');
                        break;
                    }
                }
                if ($rule && preg_match('/(?:^|;)UNTIL=([0-9]{8})(?:;|$)/i', $rule, $matches)) {
                    try {
                        $parsedUntil = CarbonImmutable::createFromFormat('!Ymd', $matches[1]);
                        if (! $parsedUntil || $parsedUntil->format('Ymd') !== $matches[1]) {
                            throw new \InvalidArgumentException('Invalid RRULE end date.');
                        }
                        $untilValues[] = $parsedUntil->toDateString();
                    } catch (\Throwable) {
                        $validator->errors()->add('recurrence_rule', 'The RRULE UNTIL value must be a valid calendar date.');

                        return;
                    }
                }
                foreach ($untilValues as $until) {
                    if ($until && CarbonImmutable::parse($until)->lt($startDate)) {
                        $validator->errors()->add('recurrence_rule', 'The RRULE UNTIL date must be on or after the event date.');
                        break;
                    }
                    if ($until && CarbonImmutable::parse($until)->gt($startDate->addYear())) {
                        $validator->errors()->add('recurrence_until', 'The recurrence end date cannot be more than one year after the event date.');
                        break;
                    }
                }
            },
        ];
    }

    private function timeInMinutes(string $time): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', $time));

        return ($hours * 60) + $minutes;
    }
}
