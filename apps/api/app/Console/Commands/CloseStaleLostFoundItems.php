<?php

namespace App\Console\Commands;

use App\Models\LostFoundItem;
use Illuminate\Console\Command;

class CloseStaleLostFoundItems extends Command
{
    protected $signature = 'lost-found:close-stale';

    protected $description = 'Close lost & found items that have been open for more than 30 days';

    public function handle(): int
    {
        $closed = LostFoundItem::query()
            ->where('status', LostFoundItem::STATUS_OPEN)
            ->where('created_at', '<', now()->subDays(LostFoundItem::AUTO_CLOSE_DAYS))
            ->update(['status' => LostFoundItem::STATUS_CLOSED, 'updated_at' => now()]);

        $this->info("Closed {$closed} lost & found item(s).");

        return self::SUCCESS;
    }
}
