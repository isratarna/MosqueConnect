<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reviews and lost & found items were each added to the reportable content types
 * on a separate branch, and each widened this column with ->change(), which
 * restates the whole column. The later migration replaced the value the earlier
 * one had set, so the column is widened once more here to hold every type the
 * API accepts.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_reports', function (Blueprint $table): void {
            $table->enum('reportable_type', ['announcement', 'event', 'campaign', 'mosque', 'review', 'lost_found'])->change();
        });
    }

    public function down(): void
    {
        DB::table('content_reports')->whereIn('reportable_type', ['review', 'lost_found'])->delete();

        Schema::table('content_reports', function (Blueprint $table): void {
            $table->enum('reportable_type', ['announcement', 'event', 'campaign', 'mosque'])->change();
        });
    }
};