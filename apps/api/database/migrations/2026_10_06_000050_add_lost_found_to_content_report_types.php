<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lost and found items can be reported like other community content.
     */
    public function up(): void
    {
        Schema::table('content_reports', function (Blueprint $table) {
            $table->enum('reportable_type', ['announcement', 'event', 'campaign', 'mosque', 'lost_found'])->change();
        });
    }

    public function down(): void
    {
        DB::table('content_reports')->where('reportable_type', 'lost_found')->delete();

        Schema::table('content_reports', function (Blueprint $table) {
            $table->enum('reportable_type', ['announcement', 'event', 'campaign', 'mosque'])->change();
        });
    }
};
