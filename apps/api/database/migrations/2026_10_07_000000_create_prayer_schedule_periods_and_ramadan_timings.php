<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prayer_schedule_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->boolean('is_ramadan')->default(false);
            $table->timestamps();
            $table->index(['mosque_id', 'starts_on', 'ends_on']);
        });

        Schema::table('prayer_times', function (Blueprint $table) {
            $table->foreignId('period_id')->nullable()->after('mosque_id')->constrained('prayer_schedule_periods')->cascadeOnDelete();
            $table->index('mosque_id');
            $table->dropUnique('prayer_times_mosque_id_prayer_unique');
            $table->unique(['mosque_id', 'period_id', 'prayer']);
        });

        Schema::create('ramadan_timings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('prayer_schedule_periods')->cascadeOnDelete();
            $table->date('date');
            $table->time('sehri_ends');
            $table->time('iftar');
            $table->time('taraweeh_time')->nullable();
            $table->timestamps();
            $table->unique(['period_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ramadan_timings');
        Schema::table('prayer_times', function (Blueprint $table) {
            $table->dropUnique('prayer_times_mosque_id_period_id_prayer_unique');
            $table->dropConstrainedForeignId('period_id');
            $table->unique(['mosque_id', 'prayer']);
        });
        Schema::dropIfExists('prayer_schedule_periods');
    }
};
