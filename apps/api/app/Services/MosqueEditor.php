<?php

namespace App\Services;

use App\Models\Mosque;
use App\Models\MosqueFacility;
use App\Models\PrayerTime;
use App\Support\ClockTime;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * The one code path that changes a mosque's profile and prayer schedule. The
 * admin editor and accepted community suggestions both go through here, so
 * they validate, save and notify followers the same way.
 */
class MosqueEditor
{
    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * @return array<string, mixed>
     */
    public static function profileRules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'string'],
            'district' => ['sometimes', 'nullable', 'string', 'max:100'],
            'area' => ['sometimes', 'nullable', 'string', 'max:100'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:255'],
            'whatsapp' => ['sometimes', 'nullable', 'string', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'website_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'facebook_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'capacity' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'established_year' => ['sometimes', 'nullable', 'integer', 'between:1800,'.now()->year],
            'khutbah_language' => ['sometimes', 'nullable', 'string', 'max:50'],
            'women_facility_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'accessibility_notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'facilities' => ['sometimes', 'array'],
            'facilities.*' => ['required', 'string', 'distinct', Rule::in(MosqueFacility::KEYS)],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function prayerScheduleRules(): array
    {
        return [
            'prayer_schedule' => ['sometimes', 'array'],
            'prayer_schedule.*.prayer' => ['required_with:prayer_schedule', 'string', Rule::in(PrayerTime::PRAYERS)],
            'prayer_schedule.*.adhan_time' => ['required_with:prayer_schedule', 'date_format:H:i'],
            'prayer_schedule.*.jamaat_time' => ['required_with:prayer_schedule', 'date_format:H:i'],
            'jumuah_sessions' => ['sometimes', 'array'],
            'jumuah_sessions.*.sequence' => ['required_with:jumuah_sessions', 'integer', 'min:1'],
            'jumuah_sessions.*.label' => ['required_with:jumuah_sessions', 'string', 'max:255'],
            'jumuah_sessions.*.khutbah_time' => ['nullable', 'date_format:H:i'],
            'jumuah_sessions.*.jamaat_time' => ['required_with:jumuah_sessions', 'date_format:H:i'],
            'jumuah_sessions.*.notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Save validated profile fields and, when given, the full set of facilities.
     *
     * @param  array<string, mixed>  $validated  Data that passed profileRules().
     */
    public function updateProfile(Mosque $mosque, array $validated): Mosque
    {
        DB::transaction(function () use ($mosque, $validated): void {
            $locked = Mosque::query()->lockForUpdate()->findOrFail($mosque->id);
            $profile = $validated;
            unset($profile['facilities']);
            $locked->fill($profile)->save();

            if (array_key_exists('facilities', $validated)) {
                $locked->facilities()->whereNotIn('facility_key', $validated['facilities'])->delete();
                foreach ($validated['facilities'] as $key) {
                    $locked->facilities()->firstOrCreate(['facility_key' => $key]);
                }
            }
        });

        return $mosque->refresh()->load('facilities');
    }

    /**
     * Save validated prayer and Jumuah times. If any time actually changed,
     * the mosque's followers are notified once with a summary of the changes.
     *
     * @param  array<string, mixed>  $validated  Data that passed prayerScheduleRules().
     * @return list<string> The changes, e.g. "Isha jamaat 8:15 PM".
     */
    public function updatePrayerSchedule(Mosque $mosque, array $validated): array
    {
        $before = $this->timesSnapshot($mosque);

        DB::transaction(function () use ($mosque, $validated): void {
            $lock = Mosque::query()->whereKey($mosque->id)->lockForUpdate()->firstOrFail();

            foreach ($validated['prayer_schedule'] ?? [] as $entry) {
                $lock->prayerTimes()->updateOrCreate(
                    ['prayer' => $entry['prayer']],
                    [
                        'adhan_time' => $entry['adhan_time'],
                        'jamaat_time' => $entry['jamaat_time'],
                    ],
                );
            }

            foreach ($validated['jumuah_sessions'] ?? [] as $entry) {
                $lock->jumuahSessions()->updateOrCreate(
                    ['sequence' => (int) $entry['sequence']],
                    [
                        'label' => $entry['label'],
                        'khutbah_time' => $entry['khutbah_time'] ?? null,
                        'jamaat_time' => $entry['jamaat_time'],
                        'notes' => $entry['notes'] ?? null,
                    ],
                );
            }
        });

        $changes = $this->describeChanges($before, $this->timesSnapshot($mosque));

        if ($changes !== []) {
            // Each saved revision gets its own reference, so a later change
            // notifies followers again while a retried request does not.
            $this->notifications->notifyPrayerScheduleChanged(
                $mosque,
                (int) now()->getPreciseTimestamp(3),
                implode(', ', $changes),
            );
        }

        return $changes;
    }

    /**
     * @return array{prayers: array<string, array{adhan: ?string, jamaat: ?string}>, jumuah: array<int, array{label: string, khutbah: ?string, jamaat: ?string}>}
     */
    private function timesSnapshot(Mosque $mosque): array
    {
        $prayers = [];
        foreach ($mosque->prayerTimes()->get() as $time) {
            $prayers[$time->prayer] = [
                'adhan' => ClockTime::format($time->adhan_time),
                'jamaat' => ClockTime::format($time->jamaat_time),
            ];
        }

        $jumuah = [];
        foreach ($mosque->jumuahSessions()->get() as $session) {
            $jumuah[(int) $session->sequence] = [
                'label' => $session->label,
                'khutbah' => ClockTime::format($session->khutbah_time),
                'jamaat' => ClockTime::format($session->jamaat_time),
            ];
        }

        return ['prayers' => $prayers, 'jumuah' => $jumuah];
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return list<string>
     */
    private function describeChanges(array $before, array $after): array
    {
        $changes = [];

        foreach (PrayerTime::PRAYERS as $prayer) {
            $old = $before['prayers'][$prayer] ?? null;
            $new = $after['prayers'][$prayer] ?? null;
            if ($new === null) {
                continue;
            }

            $label = PrayerTime::PRAYER_LABELS[$prayer];
            if (($old['jamaat'] ?? null) !== $new['jamaat']) {
                $changes[] = "{$label} jamaat ".$this->twelveHour($new['jamaat']);
            } elseif (($old['adhan'] ?? null) !== $new['adhan']) {
                $changes[] = "{$label} adhan ".$this->twelveHour($new['adhan']);
            }
        }

        foreach ($after['jumuah'] as $sequence => $new) {
            $old = $before['jumuah'][$sequence] ?? null;
            if (($old['jamaat'] ?? null) !== $new['jamaat']) {
                $changes[] = "{$new['label']} jamaat ".$this->twelveHour($new['jamaat']);
            } elseif (($old['khutbah'] ?? null) !== $new['khutbah'] && $new['khutbah'] !== null) {
                $changes[] = "{$new['label']} khutbah ".$this->twelveHour($new['khutbah']);
            }
        }

        return $changes;
    }

    private function twelveHour(?string $time): string
    {
        return $time === null ? '' : date('g:i A', strtotime($time));
    }
}
