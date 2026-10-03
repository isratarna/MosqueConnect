<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table): void {
            $table->foreignId('mosque_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('notifications')->whereNull('mosque_id')->delete();

        Schema::table('notifications', function (Blueprint $table): void {
            $table->foreignId('mosque_id')->nullable(false)->change();
        });
    }
};
