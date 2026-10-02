<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var array<string, list<string>> */
    private const INDEXES = [
        'mosques' => ['name', 'address'],
        'events' => ['title', 'description'],
        'campaigns' => ['title', 'summary'],
        'announcements' => ['title', 'body'],
    ];

    /**
     * FULLTEXT indexes for the site-wide search. Only MySQL has them; SQLite
     * (used by the tests) falls back to LIKE in SearchService.
     */
    public function up(): void
    {
        if (! $this->supported()) {
            return;
        }

        foreach (self::INDEXES as $table => $columns) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->fullText($columns, "{$table}_search_fulltext"));
        }
    }

    public function down(): void
    {
        if (! $this->supported()) {
            return;
        }

        foreach (self::INDEXES as $table => $columns) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropFullText("{$table}_search_fulltext"));
        }
    }

    private function supported(): bool
    {
        return in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'], true);
    }
};
