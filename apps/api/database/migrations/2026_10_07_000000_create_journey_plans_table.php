<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Journey plan gula ekhane thake: share kora link (/journey/:id) ar 15 min-er
     * cache duitar kajei lage. request_hash diye same trip abar chaile routing
     * API ke abar call kori na.
     */
    public function up(): void
    {
        Schema::create('journey_plans', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('request_hash', 64)->index();
            $table->json('request');
            $table->json('response');
            $table->unsignedSmallInteger('routing_calls')->default(0);
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journey_plans');
    }
};
