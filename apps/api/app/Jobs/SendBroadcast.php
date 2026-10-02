<?php

namespace App\Jobs;

use App\Models\Broadcast;
use App\Models\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Delivers a super-admin broadcast as in-app notifications, in chunks.
 */
class SendBroadcast implements ShouldQueue
{
    use Queueable;

    public function __construct(public Broadcast $broadcast) {}

    public function handle(): void
    {
        $broadcast = $this->broadcast;
        $sent = 0;

        $broadcast->recipients()->select('users.id')->chunkById(500, function ($users) use ($broadcast, &$sent): void {
            $now = now();

            $sent += Notification::query()->insertOrIgnore($users->map(fn ($user): array => [
                'user_id' => $user->id,
                'mosque_id' => null,
                'type' => Notification::TYPE_SYSTEM,
                'title' => $broadcast->title,
                'message' => $broadcast->message,
                'reference_type' => Notification::REFERENCE_BROADCAST,
                'reference_id' => $broadcast->id,
                'link' => $broadcast->link,
                'is_read' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all());
        }, 'users.id', 'id');

        $broadcast->update(['recipients_count' => $sent, 'sent_at' => now()]);
    }
}
