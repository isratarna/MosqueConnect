<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_reports', function (Blueprint $table): void {
            $table->enum('reportable_type', ['announcement', 'event', 'campaign', 'mosque', 'review'])->change();
        });
    }

    public function down(): void
    {
        DB::table('content_reports')->where('reportable_type', 'review')->delete();

        Schema::table('content_reports', function (Blueprint $table): void {
            $table->enum('reportable_type', ['announcement', 'event', 'campaign', 'mosque'])->change();
        });
    }
};
