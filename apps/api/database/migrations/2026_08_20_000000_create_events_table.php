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
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('category', [
                'Islamic Lecture',
                'Quran Program',
                'Community Gathering',
                'Charity',
                'Volunteer Activity',
                'Youth Program',
                'Workshop',
                'Iftar',
                'Educational Program',
                'Other',
            ]);
            $table->date('event_date');
            $table->time('start_time');
            $table->time('end_time')->nullable();
            $table->string('location');
            $table->unsignedInteger('capacity')->nullable();
            $table->boolean('registration_required')->default(false);
            $table->enum('status', [
                'draft',
                'published',
                'cancelled',
                'completed',
            ])->default('draft');
            $table->timestamps();

            $table->index(['status', 'event_date']);
            $table->index(['mosque_id', 'event_date']);
            $table->index('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
