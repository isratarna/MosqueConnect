<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Campaign;
use App\Models\Event;
use App\Models\Mosque;
use App\Models\VolunteerOpportunity;
use App\Support\TextSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Site-wide search. Each group returns its first few matches and a total,
 * and every item has the same shape: { type, id, title, subtitle, url }.
 */
class SearchService
{
    public const TYPES = ['mosques', 'events', 'campaigns', 'announcements', 'volunteer_opportunities'];

    public const PER_GROUP = 5;

    /** Announcements older than this are left out of search. */
    public const ANNOUNCEMENT_DAYS = 90;

    /**
     * @param  list<string>  $types
     * @return array<string, array{total: int, items: list<array<string, mixed>>}>
     */
    public function search(string $term, array $types = self::TYPES): array
    {
        $results = [];

        foreach (self::TYPES as $type) {
            if (in_array($type, $types, true)) {
                $results[$type] = $this->group($this->query($type, $term), $type);
            }
        }

        return $results;
    }

    private function query(string $type, string $term): Builder
    {
        return match ($type) {
            'mosques' => Mosque::query()->search($term)->orderBy('name'),
            'events' => TextSearch::apply(Event::query()->published()->whereDate('event_date', '>=', today()), ['title', 'description'], $term)
                ->with('mosque:id,name')
                ->orderBy('event_date'),
            'campaigns' => TextSearch::apply(Campaign::query()->publiclyActive(), ['title', 'summary'], $term)
                ->with('mosque:id,name')
                ->orderBy('ends_on'),
            'announcements' => TextSearch::apply(
                Announcement::query()->published()->where('published_at', '>=', now()->subDays(self::ANNOUNCEMENT_DAYS)),
                ['title', 'body'],
                $term,
            )->with('mosque:id,name')->orderByDesc('published_at'),
            'volunteer_opportunities' => VolunteerOpportunity::query()
                ->available()
                ->where(fn (Builder $query) => $query
                    ->where('title', 'like', $this->like($term))
                    ->orWhere('description', 'like', $this->like($term)))
                ->with('mosque:id,name')
                ->orderBy('opportunity_date'),
        };
    }

    /**
     * @return array{total: int, items: list<array<string, mixed>>}
     */
    private function group(Builder $query, string $type): array
    {
        return [
            'total' => (clone $query)->toBase()->getCountForPagination(),
            'items' => $query->limit(self::PER_GROUP)->get()->map(fn (Model $model): array => $this->item($type, $model))->values()->all(),
        ];
    }

    /**
     * @return array{type: string, id: int, title: string, subtitle: ?string, url: string}
     */
    private function item(string $type, Model $model): array
    {
        [$singular, $title, $subtitle, $url] = match ($type) {
            'mosques' => ['mosque', $model->name, collect([$model->area, $model->district])->filter()->implode(', ') ?: Str::limit($model->address, 80), "/mosque/{$model->id}"],
            'events' => ['event', $model->title, $this->withMosque($model, $model->event_date?->format('j M Y')), "/community/events/{$model->id}"],
            'campaigns' => ['campaign', $model->title, $this->withMosque($model, Str::limit($model->summary, 80)), "/campaigns/{$model->id}"],
            'announcements' => ['announcement', $model->title, $this->withMosque($model, $model->published_at?->format('j M Y')), "/community/announcements/{$model->id}"],
            'volunteer_opportunities' => ['volunteer_opportunity', $model->title, $this->withMosque($model, $model->opportunity_date?->format('j M Y')), "/volunteers?opportunity={$model->id}"],
        };

        return [
            'type' => $singular,
            'id' => $model->id,
            'title' => $title,
            'subtitle' => $subtitle,
            'url' => $url,
        ];
    }

    private function withMosque(Model $model, ?string $detail): ?string
    {
        return collect([$model->mosque?->name, $detail])->filter()->implode(' · ') ?: null;
    }

    private function like(string $term): string
    {
        return '%'.addcslashes(trim($term), '%_\\').'%';
    }
}
