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
        Schema::create('prayer_times', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->enum('prayer', ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
            $table->time('adhan_time');
            $table->time('jamaat_time');
            $table->timestamps();

            $table->unique(['mosque_id', 'prayer']);
        });

        Schema::create('jumuah_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('sequence');
            $table->string('label');
            $table->time('khutbah_time')->nullable();
            $table->time('jamaat_time');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->unique(['mosque_id', 'sequence']);
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('body');
            $table->enum('urgency', ['low', 'medium', 'high'])->default('low')->index();
            $table->enum('status', ['draft', 'published'])->default('draft')->index();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamps();

            $table->index(['mosque_id', 'status', 'published_at']);
        });

        Schema::create('mosque_facilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->enum('facility_key', [
                'women_area',
                'child_care',
                'wudu',
                'parking',
                'ac',
                'wheelchair',
                'quran_class',
                'library',
            ]);
            $table->timestamps();

            $table->unique(['mosque_id', 'facility_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mosque_facilities');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('jumuah_sessions');
        Schema::dropIfExists('prayer_times');
    }
};
