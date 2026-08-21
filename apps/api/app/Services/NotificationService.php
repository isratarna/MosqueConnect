<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Mosque;
use App\Models\Notification;
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
            'reference_type' => 'event',
            'reference_id' => $event->id,
        ]);
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

                    Notification::query()->insert($notifications);
                    $created += count($notifications);
                });

            return $created;
        });
    }
}
