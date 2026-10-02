<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Matches a search term against text columns: a FULLTEXT match on MySQL,
 * LIKE everywhere else (SQLite in the tests). Terms shorter than MySQL's
 * minimum indexed word length also use LIKE, so two-letter searches still work.
 */
final class TextSearch
{
    private const FULLTEXT_MIN_LENGTH = 3;

    /**
     * @param  list<string>  $fullTextColumns  Columns covered by one FULLTEXT index.
     * @param  list<string>  $likeColumns  Extra columns that are always matched with LIKE.
     */
    public static function apply(Builder $query, array $fullTextColumns, string $term, array $likeColumns = []): Builder
    {
        $term = trim($term);
        $driver = $query->getConnection()->getDriverName();
        $useFullText = in_array($driver, ['mysql', 'mariadb'], true) && mb_strlen($term) >= self::FULLTEXT_MIN_LENGTH;
        $like = '%'.addcslashes($term, '%_\\').'%';

        return $query->where(function (Builder $query) use ($fullTextColumns, $likeColumns, $term, $useFullText, $like): void {
            if ($useFullText) {
                $words = collect(preg_split('/\s+/', preg_replace('/[+\-<>()~*"@]+/', ' ', $term)))
                    ->filter()
                    ->map(fn (string $word): string => "+{$word}*")
                    ->implode(' ');
                $query->whereFullText($fullTextColumns, $words, ['mode' => 'boolean']);
            } else {
                foreach ($fullTextColumns as $column) {
                    $query->orWhere($column, 'like', $like);
                }
            }

            foreach ($likeColumns as $column) {
                $query->orWhere($column, 'like', $like);
            }
        });
    }
}
