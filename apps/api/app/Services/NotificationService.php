<?php

namespace App\Services;

use App\Models\Mosque;
use App\Models\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class NotificationService
{
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

            $mosque->followers()
                ->select(['id', 'user_id'])
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
