<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\Event;
use App\Models\Mosque;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\Cursor;
use Illuminate\Pagination\CursorPaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Builds the signed-in user's "from my mosques" feed: one newest-first stream
 * of the announcements, upcoming events, active campaigns and prayer schedule
 * changes of every mosque the user follows.
 *
 * Every source is queried in its own newest-first slice that starts below the
 * requested cursor, the slices are merged in PHP and the page is cut from the
 * merged result. The cursor is the framework's published_at + type + id cursor,
 * so the order matches a single query over a union without writing that union,
 * and it stays stable because no item can move once it has been returned.
 */
class FeedService
{
    public const TYPE_ANNOUNCEMENT = 'announcement';

    public const TYPE_EVENT = 'event';

    public const TYPE_CAMPAIGN = 'campaign';

    public const TYPE_PRAYER_SCHEDULE = 'prayer_schedule';

    public const DEFAULT_PER_PAGE = 15;

    public const MAX_PER_PAGE = 50;

    /**
     * Feed sources with the timestamp each one is ordered and paginated by.
     * The position in this list is the tie-break rank, so two items sharing a
     * timestamp always come back in the same order.
     *
     * Events and campaigns have no published_at column, so their creation time
     * stands in for it.
     *
     * @var list<array{type: string, column: string}>
     */
    private const SOURCES = [
        ['type' => self::TYPE_ANNOUNCEMENT, 'column' => 'published_at'],
        ['type' => self::TYPE_EVENT, 'column' => 'created_at'],
        ['type' => self::TYPE_CAMPAIGN, 'column' => 'created_at'],
        ['type' => self::TYPE_PRAYER_SCHEDULE, 'column' => 'created_at'],
    ];

    private const TIMESTAMP_FORMAT = 'Y-m-d H:i:s';

    /**
     * The cursor columns, in the order the total order reads them. The
     * paginator uses this list to read a cursor back off an item, so the
     * parameter names and the item keys have to match.
     *
     * @var list<string>
     */
    private const CURSOR_PARAMETERS = ['published_at', 'type', 'id'];

    /**
     * One page of the user's feed, newest first.
     */
    public function forUser(User $user, int $perPage = self::DEFAULT_PER_PAGE, ?string $cursor = null): CursorPaginator
    {
        $perPage = max(1, min($perPage, self::MAX_PER_PAGE));
        $position = $this->decode($cursor);
        $items = new Collection;

        foreach (self::SOURCES as $rank => $source) {
            $query = $this->sourceQuery($user, $source['type']);

            if ($position !== null) {
                $this->before($query, $source['column'], $position, $rank);
            }

            $items = $items->merge(
                $query
                    ->orderByDesc($source['column'])
                    ->orderByDesc('id')
                    // One row more than the page size is what tells the
                    // paginator another page exists, without a count query.
                    ->limit($perPage + 1)
                    ->get()
                    ->map(fn ($model): array => $this->toItem($model, $source['type'], $source['column'], $rank)),
            );
        }

        // Newest first, and for items sharing a timestamp the source rank then
        // the id, so the order never depends on how the sources are merged.
        $page = $items
            ->sort(fn (array $left, array $right): int => $right['_sort'] <=> $left['_sort']
                ?: $left['_rank'] <=> $right['_rank']
                ?: $right['id'] <=> $left['id'])
            ->take($perPage + 1)
            ->map(fn (array $item): array => Arr::except($item, ['_sort', '_rank']))
            ->values();

        return new CursorPaginator($page, $perPage, $position, [
            'path' => request()->url(),
            'query' => Arr::except(request()->query(), ['cursor']),
            'parameters' => self::CURSOR_PARAMETERS,
        ]);
    }

    /**
     * The published items of one type, restricted to the mosques this user
     * follows. Prayer schedule changes are the user's own prayer_schedule
     * notifications: the notification fan-out is what records that a schedule
     * was saved or that a dated period starts, so the feed replays them.
     *
     * @return Builder<Announcement|Event|Campaign|Notification>
     */
    private function sourceQuery(User $user, string $type): Builder
    {
        $mosqueIds = $user->followedMosques()->select('mosques.id');

        return match ($type) {
            self::TYPE_ANNOUNCEMENT => Announcement::query()
                ->published()
                ->whereIn('mosque_id', $mosqueIds)
                ->with('mosque:id,name,verification_status'),
            self::TYPE_EVENT => Event::query()
                ->published()
                ->where('moderation_status', Event::MODERATION_APPROVED)
                ->whereDate('event_date', '>=', today())
                ->whereIn('mosque_id', $mosqueIds)
                ->with('mosque:id,name,verification_status'),
            self::TYPE_CAMPAIGN => Campaign::query()
                ->publiclyActive()
                ->whereIn('mosque_id', $mosqueIds)
                ->with('mosque:id,name,verification_status'),
            self::TYPE_PRAYER_SCHEDULE => Notification::query()
                ->where('user_id', $user->id)
                ->where('type', Notification::TYPE_PRAYER_SCHEDULE)
                ->with('mosque:id,name,verification_status'),
        };
    }

    /**
     * Narrow a source to the rows that sort after the cursor position, using
     * the same total order the merged page is cut with: timestamp newest first,
     * then source rank ascending, then id newest first.
     *
     * @param  Builder<Announcement|Event|Campaign|Notification>  $query
     */
    private function before(Builder $query, string $column, Cursor $cursor, int $rank): void
    {
        $at = $this->toDatabaseTimestamp($cursor->parameter('published_at'));
        $cursorRank = $this->rankOf($cursor->parameter('type'));

        if ($rank > $cursorRank) {
            // This source sorts after the cursor's source, so a row sharing the
            // cursor's timestamp still belongs on a later page.
            $query->where($column, '<=', $at);

            return;
        }

        if ($rank < $cursorRank) {
            // This source sorts before the cursor's source, so a row sharing
            // the cursor's timestamp has already been returned.
            $query->where($column, '<', $at);

            return;
        }

        // Same source as the cursor: only rows that are older, or that share
        // the timestamp with a smaller id, are still to be returned.
        $query->where(function (Builder $inner) use ($column, $at, $cursor): void {
            $inner->where($column, '<', $at)
                ->orWhere(function (Builder $tie) use ($column, $at, $cursor): void {
                    $tie->where($column, $at)->where('id', '<', (int) $cursor->parameter('id'));
                });
        });
    }

    private function rankOf(string $type): int
    {
        return (int) array_search($type, array_column(self::SOURCES, 'type'), true);
    }

    /**
     * @param  Announcement|Event|Campaign|Notification  $model
     * @return array<string, mixed>
     */
    private function toItem(object $model, string $type, string $column, int $rank): array
    {
        $publishedAt = $model->{$column};

        return [
            'type' => $type,
            'id' => (int) $model->id,
            'title' => (string) $model->title,
            'summary' => $this->summary($model, $type),
            'mosque' => $this->mosque($model),
            'published_at' => $publishedAt?->toJSON(),
            'url' => $this->url($model, $type),
            '_sort' => $publishedAt?->format(self::TIMESTAMP_FORMAT) ?? '',
            '_rank' => $rank,
        ];
    }

    private function summary(object $model, string $type): ?string
    {
        $body = match ($type) {
            self::TYPE_ANNOUNCEMENT => $model->body,
            self::TYPE_EVENT => $model->description,
            self::TYPE_CAMPAIGN => $model->summary ?: $model->description,
            default => $model->message,
        };

        if ($body === null || $body === '') {
            return null;
        }

        return Str::limit(trim(preg_replace('/\s+/', ' ', strip_tags((string) $body)) ?? ''), 200, '...');
    }

    /**
     * @return array{id: int, name: string, verified: bool}|null
     */
    private function mosque(object $model): ?array
    {
        if ($model->mosque === null) {
            return null;
        }

        return [
            'id' => (int) $model->mosque->id,
            'name' => (string) $model->mosque->name,
            'verified' => $model->mosque->verification_status === Mosque::VERIFICATION_VERIFIED,
        ];
    }

    private function url(object $model, string $type): string
    {
        return match ($type) {
            self::TYPE_ANNOUNCEMENT => url("/api/announcements/{$model->id}"),
            self::TYPE_EVENT => url("/api/events/{$model->id}"),
            self::TYPE_CAMPAIGN => url("/api/campaigns/{$model->id}"),
            default => url("/api/mosques/{$model->mosque_id}/prayer-schedule"),
        };
    }

    /**
     * Read the published_at, type and id a cursor points at, ignoring anything
     * a client sends that is not one.
     *
     * The feed is only ever walked forwards, so a cursor is normalised to point
     * at the next items: otherwise the paginator would reverse the page it is
     * handed.
     */
    private function decode(?string $encoded): ?Cursor
    {
        if ($encoded === null || $encoded === '') {
            return null;
        }

        $cursor = Cursor::fromEncoded($encoded);
        if ($cursor === null) {
            return null;
        }

        $parameters = $cursor->toArray();
        $usable = is_string($parameters['published_at'] ?? null)
            && in_array($parameters['type'] ?? null, array_column(self::SOURCES, 'type'), true)
            && is_numeric($parameters['id'] ?? null);

        return $usable ? new Cursor(Arr::except($parameters, ['_pointsToNextItems']), true) : null;
    }

    /**
     * Timestamps are handed out as offset-aware ISO strings but stored as naive
     * values in the app timezone, so a cursor value has to be converted back
     * before it can be compared against a column. Columns here hold whole
     * seconds, which is the resolution the cursor is cut at.
     */
    private function toDatabaseTimestamp(?string $publishedAt): string
    {
        return Carbon::parse((string) $publishedAt)
            ->setTimezone(config('app.timezone'))
            ->format(self::TIMESTAMP_FORMAT);
    }
}
