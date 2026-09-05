<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
        });
        Schema::create('volunteer_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('volunteer_opportunity_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['volunteer_opportunity_id', 'user_id'], 'volunteer_registration_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('volunteer_registrations');
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['email']);
            $table->dropColumn(['email', 'email_verified_at']);
        });
    }
};
