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
        Schema::create('eid_jamaats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->enum('eid', ['fitr', 'adha']);
            $table->unsignedSmallInteger('year');
            $table->date('date');
            $table->time('jamaat_time');
            $table->unsignedTinyInteger('sequence');
            // Set for a jamaat held away from the mosque, such as an Eidgah field.
            $table->string('location_name')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('khutbah_language', 50)->nullable();
            $table->boolean('women_arrangement')->default(false);
            $table->string('notes', 1000)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(['mosque_id', 'eid', 'year', 'sequence']);
            $table->index(['eid', 'year', 'published_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('eid_jamaats');
    }
};
