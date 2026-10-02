<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mosque_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->enum('moderation_status', ['approved', 'hidden'])->default('approved')->index();
            $table->timestamps();
            $table->unique(['mosque_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mosque_reviews');
    }
};
