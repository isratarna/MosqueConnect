<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('mosque_daily_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->unsignedInteger('profile_views')->default(0);
            $table->unsignedInteger('direction_clicks')->default(0);
            $table->unsignedInteger('call_clicks')->default(0);
            $table->unsignedInteger('follows')->default(0);
            $table->unsignedInteger('unfollows')->default(0);

            $table->unique(['mosque_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mosque_daily_stats');
    }
};
