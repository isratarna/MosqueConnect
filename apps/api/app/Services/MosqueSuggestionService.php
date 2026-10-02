<?php

namespace App\Services;

use App\Models\Mosque;
use App\Models\MosqueEditSuggestion;
use App\Models\MosqueFacility;
use App\Models\Notification;
use App\Models\PrayerTime;
use App\Models\User;
use App\Support\ClockTime;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Community-suggested corrections: creating them, showing what they would
 * change, and accepting or rejecting them. Accepting applies the change through
 * MosqueEditor, the same code path as the admin editor.
 */
class MosqueSuggestionService
{
    public const FIELD_LABELS = [
        MosqueEditSuggestion::FIELD_PRAYER_TIME => 'Prayer time',
        MosqueEditSuggestion::FIELD_JUMUAH => 'Jumuah time',
        MosqueEditSuggestion::FIELD_PHONE => 'Phone number',
        MosqueEditSuggestion::FIELD_ADDRESS => 'Address',
        MosqueEditSuggestion::FIELD_LOCATION => 'Map location',
        MosqueEditSuggestion::FIELD_FACILITIES => 'Facilities',
        MosqueEditSuggestion::FIELD_OTHER => 'Something else',
    ];

    public function __construct(
        private readonly MosqueEditor $editor,
        private readonly PrayerScheduleService $schedules,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * Validation rules for the payload of a suggestion to the given field.
     *
     * @return array<string, mixed>
     */
    public static function payloadRules(string $field): array
    {
        return match ($field) {
            MosqueEditSuggestion::FIELD_PRAYER_TIME => [
                'payload.prayer' => ['required', Rule::in(PrayerTime::PRAYERS)],
                'payload.jamaat_time' => ['required', 'date_format:H:i'],
                'payload.adhan_time' => ['nullable', 'date_format:H:i'],
            ],
            MosqueEditSuggestion::FIELD_JUMUAH => [
                'payload.sequence' => ['nullable', 'integer', 'between:1,10'],
                'payload.jamaat_time' => ['required', 'date_format:H:i'],
                'payload.khutbah_time' => ['nullable', 'date_format:H:i'],
            ],
            MosqueEditSuggestion::FIELD_PHONE => [
                'payload.phone' => ['required', 'string', 'max:50', 'regex:/^[0-9+\-\s()]{5,50}$/'],
            ],
            MosqueEditSuggestion::FIELD_ADDRESS => [
                'payload.address' => ['required', 'string', 'max:500'],
                'payload.district' => ['nullable', 'string', 'max:100'],
                'payload.area' => ['nullable', 'string', 'max:100'],
            ],
            MosqueEditSuggestion::FIELD_LOCATION => [
                'payload.latitude' => ['required', 'numeric', 'between:-90,90'],
                'payload.longitude' => ['required', 'numeric', 'between:-180,180'],
            ],
            MosqueEditSuggestion::FIELD_FACILITIES => [
                'payload.facilities' => ['present', 'array'],
                'payload.facilities.*' => ['string', 'distinct', Rule::in(MosqueFacility::KEYS)],
            ],
            default => [],
        };
    }

    /**
     * Record a suggestion. A trusted contributor's suggestion for a mosque
     * nobody manages is applied straight away.
     *
     * @param  array<string, mixed>  $payload  Validated against payloadRules().
     */
    public function create(Mosque $mosque, User $user, string $field, array $payload, ?string $note): MosqueEditSuggestion
    {
        $payload = $this->normalisePayload($field, $payload);
        $before = $this->currentValue($mosque, $field, $payload);

        abort_if($this->changesNothing($field, $payload, $before), 422, 'That is already what the mosque shows. Nothing would change.');

        $suggestion = MosqueEditSuggestion::query()->create([
            'mosque_id' => $mosque->id,
            'user_id' => $user->id,
            'field' => $field,
            'payload' => $payload,
            'before' => $before,
            'note' => $note,
            'status' => MosqueEditSuggestion::STATUS_PENDING,
        ]);

        if ($this->canAutoAccept($suggestion, $mosque, $user)) {
            return $this->accept($suggestion, null, 'Accepted automatically: suggested by a trusted contributor.');
        }

        return $suggestion;
    }

    /**
     * Apply a pending suggestion and mark it accepted.
     */
    public function accept(MosqueEditSuggestion $suggestion, ?User $reviewer, ?string $reviewNote = null): MosqueEditSuggestion
    {
        $accepted = DB::transaction(function () use ($suggestion, $reviewer, $reviewNote): MosqueEditSuggestion {
            $locked = MosqueEditSuggestion::query()->lockForUpdate()->findOrFail($suggestion->id);
            abort_unless($locked->isPending(), 422, 'This suggestion has already been reviewed.');

            $this->apply($locked);

            $locked->update([
                'status' => MosqueEditSuggestion::STATUS_ACCEPTED,
                'reviewed_by' => $reviewer?->id,
                'review_note' => $reviewNote,
                'reviewed_at' => now(),
            ]);
            User::query()->whereKey($locked->user_id)->increment('accepted_suggestions_count');

            return $locked;
        });

        $this->notifySuggester($accepted, true);

        return $accepted;
    }

    public function reject(MosqueEditSuggestion $suggestion, User $reviewer, ?string $reviewNote = null): MosqueEditSuggestion
    {
        $rejected = DB::transaction(function () use ($suggestion, $reviewer, $reviewNote): MosqueEditSuggestion {
            $locked = MosqueEditSuggestion::query()->lockForUpdate()->findOrFail($suggestion->id);
            abort_unless($locked->isPending(), 422, 'This suggestion has already been reviewed.');

            $locked->update([
                'status' => MosqueEditSuggestion::STATUS_REJECTED,
                'reviewed_by' => $reviewer->id,
                'review_note' => $reviewNote,
                'reviewed_at' => now(),
            ]);

            return $locked;
        });

        $this->notifySuggester($rejected, false);

        return $rejected;
    }

    /**
     * A mosque is managed when it is verified and has someone on its team.
     * Suggestions for every other mosque are reviewed by the super admin.
     */
    public function isManaged(Mosque $mosque): bool
    {
        return $mosque->isVerified() && $mosque->members()->accepted()->exists();
    }

    /**
     * Limit a suggestion query to mosques nobody manages.
     */
    public function whereUnmanaged(Builder $query): Builder
    {
        return $query->whereHas('mosque', fn (Builder $mosque) => $mosque->where(fn (Builder $q) => $q
            ->where('verification_status', '!=', Mosque::VERIFICATION_VERIFIED)
            ->orWhereDoesntHave('members', fn (Builder $members) => $members->whereNotNull('accepted_at'))));
    }

    /**
     * The mosque's current value for the part a suggestion would change.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>|null
     */
    public function currentValue(Mosque $mosque, string $field, array $payload): ?array
    {
        return match ($field) {
            MosqueEditSuggestion::FIELD_PRAYER_TIME => $this->currentPrayer($mosque, $payload['prayer']),
            MosqueEditSuggestion::FIELD_JUMUAH => $this->currentJumuah($mosque, (int) ($payload['sequence'] ?? 1)),
            MosqueEditSuggestion::FIELD_PHONE => ['phone' => $mosque->phone],
            MosqueEditSuggestion::FIELD_ADDRESS => [
                'address' => $mosque->address,
                'district' => $mosque->district,
                'area' => $mosque->area,
            ],
            MosqueEditSuggestion::FIELD_LOCATION => [
                'latitude' => $mosque->latitude === null ? null : (float) $mosque->latitude,
                'longitude' => $mosque->longitude === null ? null : (float) $mosque->longitude,
            ],
            MosqueEditSuggestion::FIELD_FACILITIES => [
                'facilities' => $mosque->facilities()->pluck('facility_key')->sort()->values()->all(),
            ],
            default => null,
        };
    }

    /**
     * Apply the suggestion through the admin editor.
     */
    private function apply(MosqueEditSuggestion $suggestion): void
    {
        $mosque = $suggestion->mosque()->firstOrFail();
        $payload = $suggestion->payload;

        switch ($suggestion->field) {
            case MosqueEditSuggestion::FIELD_PRAYER_TIME:
                $current = $this->currentPrayer($mosque, $payload['prayer']);
                $this->updateSchedule($mosque, ['prayer_schedule' => [[
                    'prayer' => $payload['prayer'],
                    'adhan_time' => $payload['adhan_time'] ?? $current['adhan_time'] ?? $payload['jamaat_time'],
                    'jamaat_time' => $payload['jamaat_time'],
                ]]]);
                break;

            case MosqueEditSuggestion::FIELD_JUMUAH:
                $sequence = (int) ($payload['sequence'] ?? 1);
                $session = $mosque->jumuahSessions()->where('sequence', $sequence)->first();
                $this->updateSchedule($mosque, ['jumuah_sessions' => [[
                    'sequence' => $sequence,
                    'label' => $session?->label ?? ($sequence === 1 ? 'Jumuah' : "Jumuah {$sequence}"),
                    'khutbah_time' => $payload['khutbah_time'] ?? ClockTime::format($session?->khutbah_time),
                    'jamaat_time' => $payload['jamaat_time'],
                    'notes' => $session?->notes,
                ]]]);
                break;

            case MosqueEditSuggestion::FIELD_OTHER:
                // Free text: the reviewer makes any change by hand.
                break;

            default:
                $this->updateProfile($mosque, $payload);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function updateSchedule(Mosque $mosque, array $data): void
    {
        $this->editor->updatePrayerSchedule($mosque, Validator::make($data, MosqueEditor::prayerScheduleRules())->validate());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function updateProfile(Mosque $mosque, array $data): void
    {
        $this->editor->updateProfile($mosque, Validator::make($data, MosqueEditor::profileRules())->validate());
    }

    /**
     * Keep only the keys each field uses, in a stable shape.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function normalisePayload(string $field, array $payload): array
    {
        return match ($field) {
            MosqueEditSuggestion::FIELD_PRAYER_TIME => array_filter([
                'prayer' => $payload['prayer'],
                'jamaat_time' => $payload['jamaat_time'],
                'adhan_time' => $payload['adhan_time'] ?? null,
            ], fn ($value) => $value !== null),
            MosqueEditSuggestion::FIELD_JUMUAH => array_filter([
                'sequence' => (int) ($payload['sequence'] ?? 1),
                'jamaat_time' => $payload['jamaat_time'],
                'khutbah_time' => $payload['khutbah_time'] ?? null,
            ], fn ($value) => $value !== null),
            MosqueEditSuggestion::FIELD_PHONE => ['phone' => trim($payload['phone'])],
            // District and area are only changed when the suggestion includes them.
            MosqueEditSuggestion::FIELD_ADDRESS => array_filter([
                'address' => trim($payload['address']),
                'district' => filled($payload['district'] ?? null) ? trim($payload['district']) : null,
                'area' => filled($payload['area'] ?? null) ? trim($payload['area']) : null,
            ], fn ($value) => $value !== null),
            MosqueEditSuggestion::FIELD_LOCATION => [
                'latitude' => round((float) $payload['latitude'], 7),
                'longitude' => round((float) $payload['longitude'], 7),
            ],
            MosqueEditSuggestion::FIELD_FACILITIES => [
                'facilities' => collect($payload['facilities'])->unique()->sort()->values()->all(),
            ],
            default => [],
        };
    }

    /**
     * Whether the suggestion matches what the mosque already shows. Confirming
     * an estimated prayer time is still useful, so that never counts as no change.
     *
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>|null  $before
     */
    private function changesNothing(string $field, array $payload, ?array $before): bool
    {
        if ($before === null || $field === MosqueEditSuggestion::FIELD_OTHER) {
            return false;
        }

        if ($field === MosqueEditSuggestion::FIELD_PRAYER_TIME) {
            return ($before['source'] ?? null) === PrayerScheduleService::SOURCE_MOSQUE
                && $before['jamaat_time'] === $payload['jamaat_time']
                && (! isset($payload['adhan_time']) || $before['adhan_time'] === $payload['adhan_time']);
        }

        if ($field === MosqueEditSuggestion::FIELD_JUMUAH) {
            return $before['jamaat_time'] === $payload['jamaat_time']
                && (! isset($payload['khutbah_time']) || $before['khutbah_time'] === $payload['khutbah_time']);
        }

        if ($field === MosqueEditSuggestion::FIELD_LOCATION) {
            return abs((float) $before['latitude'] - $payload['latitude']) < 0.000001
                && abs((float) $before['longitude'] - $payload['longitude']) < 0.000001;
        }

        return array_intersect_key($before, $payload) == $payload;
    }

    private function canAutoAccept(MosqueEditSuggestion $suggestion, Mosque $mosque, User $user): bool
    {
        return config('suggestions.auto_accept_trusted', true)
            && $suggestion->field !== MosqueEditSuggestion::FIELD_OTHER
            && $user->isTrustedContributor()
            && ! $this->isManaged($mosque);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function currentPrayer(Mosque $mosque, string $prayer): ?array
    {
        // Fresh times, since the mosque may have changed since it was loaded.
        $mosque->setRelation('prayerTimes', $mosque->prayerTimes()->get());
        $entry = collect($this->schedules->forDate($mosque))->firstWhere('prayer', $prayer);

        return $entry ? [
            'prayer' => $prayer,
            'adhan_time' => $entry['adhan_time'],
            'jamaat_time' => $entry['jamaat_time'],
            'source' => $entry['source'],
        ] : ['prayer' => $prayer, 'adhan_time' => null, 'jamaat_time' => null, 'source' => null];
    }

    /**
     * @return array<string, mixed>
     */
    private function currentJumuah(Mosque $mosque, int $sequence): array
    {
        $session = $mosque->jumuahSessions()->where('sequence', $sequence)->first();

        return [
            'sequence' => $sequence,
            'label' => $session?->label,
            'khutbah_time' => ClockTime::format($session?->khutbah_time),
            'jamaat_time' => ClockTime::format($session?->jamaat_time),
        ];
    }

    private function notifySuggester(MosqueEditSuggestion $suggestion, bool $accepted): void
    {
        $mosque = $suggestion->mosque()->first();
        if (! $mosque) {
            return;
        }

        $what = strtolower(self::FIELD_LABELS[$suggestion->field] ?? 'details');
        $note = filled($suggestion->review_note) ? ' Note: '.$suggestion->review_note : '';

        $this->notifications->notifyUser($suggestion->user_id, $mosque, [
            'type' => Notification::TYPE_SUGGESTION,
            'title' => $accepted ? 'Your correction was accepted' : 'Your correction was not accepted',
            'message' => $accepted
                ? "Thank you! Your correction to the {$what} of {$mosque->name} is now live.{$note}"
                : "Your suggested correction to the {$what} of {$mosque->name} was not accepted.{$note}",
            'reference_type' => Notification::REFERENCE_SUGGESTION,
            'reference_id' => $suggestion->id,
        ]);
    }
}
