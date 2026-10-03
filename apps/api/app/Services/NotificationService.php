<?php

namespace App\Services;

use App\Models\EidJamaat;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\PrayerSchedulePeriod;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class NotificationService
{
    /**
     * Notify the current mosque followers about a newly published event.
     */
    public function notifyEventPublished(Event $event): int
    {
        if ($event->status !== Event::STATUS_PUBLISHED) {
            return 0;
        }

        $event->loadMissing('mosque');

        return $this->notifyMosqueFollowers($event->mosque, [
            'type' => Notification::TYPE_EVENT,
            'title' => Str::limit("New Event: {$event->title}", 255, ''),
            'message' => "{$event->mosque->name} published a new event: {$event->title}.",
            'reference_type' => Notification::REFERENCE_EVENT,
            'reference_id' => $event->id,
        ]);
    }

    public function notifyEventRegistrants(Event $event, string $referenceType, string $title, string $message, ?int $referenceId = null): int
    {
        $event->loadMissing('mosque');
        $created = 0;
        $referenceId ??= $event->id;

        $event->registrations()
            ->whereIn('status', [EventRegistration::STATUS_REGISTERED, EventRegistration::STATUS_ATTENDED, EventRegistration::STATUS_WAITLISTED])
            ->with('user')
            ->chunkById(500, function ($registrations) use ($event, $referenceType, $referenceId, $title, $message, &$created): void {
                foreach ($registrations as $registration) {
                    $alreadySent = Notification::query()
                        ->where('user_id', $registration->user_id)
                        ->where('reference_type', $referenceType)
                        ->where('reference_id', $referenceId)
                        ->exists();

                    if ($alreadySent) {
                        continue;
                    }

                    $created += (int) $this->notifyUser($registration->user_id, $event->mosque, [
                        'type' => Notification::TYPE_EVENT,
                        'title' => $title,
                        'message' => $message,
                        'reference_type' => $referenceType,
                        'reference_id' => $referenceId,
                    ]);
                }
            });

        return $created;
    }

    public function notifyVolunteer(int $userId, Mosque $mosque, int $referenceId, string $title, string $message, string $referenceType = Notification::REFERENCE_VOLUNTEER_APPLICATION): bool
    {
        return $this->notifyUser($userId, $mosque, [
            'type' => Notification::TYPE_VOLUNTEER,
            'title' => Str::limit($title, 255, ''),
            'message' => Str::limit($message, 10000, ''),
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
        ]);
    }

    /**
     * Notify followers when an announcement is published.
     *
     * The announcement module is not implemented yet, so its persisted ID and
     * title form the narrow integration contract for that future feature.
     */
    public function notifyAnnouncementPublished(Mosque $mosque, int $announcementId, string $title, ?string $category = null): int
    {
        if ($category === 'janazah') {
            $title = "Janazah: {$title}";
        }

        return $this->notifyMosqueFollowers($mosque, [
            'type' => Notification::TYPE_ANNOUNCEMENT,
            'title' => Str::limit("New Announcement: {$title}", 255, ''),
            'message' => Str::limit("{$mosque->name} published a new announcement: {$title}.", 10000, ''),
            'reference_type' => Notification::REFERENCE_ANNOUNCEMENT,
            'reference_id' => $announcementId,
        ]);
    }

    /**
     * Notify followers about one persisted prayer schedule change.
     *
     * A distinct change ID should be supplied for each schedule revision. This
     * lets separate revisions notify followers while retries remain idempotent.
     */
    public function notifyPrayerScheduleChanged(
        Mosque $mosque,
        int $scheduleChangeId,
        ?string $summary = null,
    ): int {
        $message = "{$mosque->name} updated its prayer schedule.";

        if (filled($summary)) {
            $message = "{$mosque->name} updated its prayer schedule: ".rtrim(trim($summary), '.').'.';
        }

        return $this->notifyMosqueFollowers($mosque, [
            'type' => Notification::TYPE_PRAYER_SCHEDULE,
            'title' => 'Prayer Schedule Updated',
            'message' => Str::limit($message, 10000, ''),
            'reference_type' => Notification::REFERENCE_PRAYER_SCHEDULE,
            'reference_id' => $scheduleChangeId,
        ]);
    }

    public function notifySchedulePeriodStarting(PrayerSchedulePeriod $period): int
    {
        $period->loadMissing('mosque');
        $title = $period->is_ramadan ? 'New Ramadan timetable from tomorrow' : 'New prayer timetable from tomorrow';

        return $this->notifyMosqueFollowers($period->mosque, [
            'type' => Notification::TYPE_PRAYER_SCHEDULE,
            'title' => $title,
            'message' => "{$period->mosque->name} starts its {$period->name} prayer timetable tomorrow.",
            'reference_type' => Notification::REFERENCE_PRAYER_SCHEDULE,
            'reference_id' => $period->id,
        ]);
    }

    /** Notify followers when a donation campaign is published. */
    public function notifyCampaignPublished(Mosque $mosque, int $campaignId, string $title): int
    {
        return $this->notifyMosqueFollowers($mosque, [
            'type' => Notification::TYPE_CAMPAIGN,
            'title' => Str::limit("New Donation Campaign: {$title}", 255, ''),
            'message' => Str::limit("{$mosque->name} launched a new donation campaign: {$title}.", 10000, ''),
            'reference_type' => Notification::REFERENCE_CAMPAIGN,
            'reference_id' => $campaignId,
        ]);
    }

    /**
     * Notify followers that a mosque published its Eid jamaat times.
     *
     * The reference is the season's earliest-created jamaat, so publishing
     * more jamaats for the same Eid later does not notify followers again.
     *
     * @param  iterable<EidJamaat>  $jamaats  The mosque's published jamaats for one Eid.
     */
    public function notifyEidJamaatsPublished(Mosque $mosque, string $eid, int $year, iterable $jamaats): int
    {
        $jamaats = collect($jamaats)->sortBy(['date', 'jamaat_time', 'sequence'])->values();

        if ($jamaats->isEmpty()) {
            return 0;
        }

        $label = EidJamaat::EID_LABELS[$eid] ?? 'Eid';
        $times = $jamaats
            ->map(function (EidJamaat $jamaat): string {
                $time = date('g:i A', strtotime($jamaat->jamaat_time));

                return $jamaat->location_name ? "{$time} ({$jamaat->location_name})" : $time;
            })
            ->implode(', ');

        return $this->notifyMosqueFollowers($mosque, [
            'type' => Notification::TYPE_EID,
            'title' => 'Eid jamaat times published',
            'message' => Str::limit("{$mosque->name} published its {$label} {$year} jamaat times: {$times}.", 10000, ''),
            'reference_type' => Notification::REFERENCE_EID_JAMAAT,
            'reference_id' => $jamaats->min('id'),
        ]);
    }

    /**
     * Notify one person about something that concerns only them, such as a
     * team invitation or the review of a correction they suggested.
     *
     * @param  array{type: string, title: string, message: string, reference_type: string, reference_id: int, link?: string}  $data
     */
    public function notifyUser(int $userId, Mosque $mosque, array $data): bool
    {
        $now = now();

        return Notification::query()->insertOrIgnore([[
            'user_id' => $userId,
            'mosque_id' => $mosque->id,
            'type' => $data['type'],
            'title' => Str::limit($data['title'], 255, ''),
            'message' => Str::limit($data['message'], 10000, ''),
            'reference_type' => $data['reference_type'],
            'reference_id' => $data['reference_id'],
            'link' => $data['link'] ?? null,
            'is_read' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ]]) > 0;
    }

    /**
     * Create one notification per current follower of the given mosque.
     *
     * Recipient identifiers are deliberately prohibited: recipients always come
     * from the mosque's follower relationship at the time this method is called.
     *
     * @param  array{
     *     type: string,
     *     title: string,
     *     message: string,
     *     reference_type?: string|null,
     *     reference_id?: int|null
     * }  $data
     * @return int Number of notifications created.
     */
    public function notifyMosqueFollowers(Mosque $mosque, array $data): int
    {
        $validated = Validator::make($data, [
            'user_id' => ['prohibited'],
            'mosque_id' => ['prohibited'],
            'notify_users' => ['prohibited'],
            'type' => ['required', 'string', Rule::in(Notification::TYPES)],
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:10000'],
            'reference_type' => ['nullable', 'string', 'max:100', 'required_with:reference_id'],
            'reference_id' => ['nullable', 'integer', 'min:1', 'required_with:reference_type'],
        ])->validate();

        return DB::transaction(function () use ($mosque, $validated): int {
            $created = 0;
            $now = now();

            $followers = $mosque->followers()
                ->select(['id', 'user_id']);

            if (isset($validated['reference_type'], $validated['reference_id'])) {
                $alreadyNotifiedUsers = Notification::query()
                    ->select('user_id')
                    ->where('mosque_id', $mosque->id)
                    ->where('type', $validated['type'])
                    ->where('reference_type', $validated['reference_type'])
                    ->where('reference_id', $validated['reference_id']);

                $followers->whereNotIn('user_id', $alreadyNotifiedUsers);
            }

            $followers
                ->chunkById(500, function ($followers) use ($mosque, $validated, $now, &$created): void {
                    $notifications = $followers->map(fn ($follower): array => [
                        'user_id' => $follower->user_id,
                        'mosque_id' => $mosque->id,
                        'type' => $validated['type'],
                        'title' => $validated['title'],
                        'message' => $validated['message'],
                        'reference_type' => $validated['reference_type'] ?? null,
                        'reference_id' => $validated['reference_id'] ?? null,
                        'is_read' => false,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])->all();

                    $created += Notification::query()->insertOrIgnore($notifications);
                });

            return $created;
        });
    }
}
