<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('terms_accepted_at')->nullable();
        });

        Schema::table('followers', function (Blueprint $table): void {
            $table->boolean('notifications_muted')->default(false);
        });

        Schema::create('notification_preferences', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('announcement')->default(true);
            $table->boolean('event')->default(true);
            $table->boolean('campaign')->default(true);
            $table->boolean('prayer_schedule')->default(true);
            $table->boolean('blood')->default(true);
            $table->boolean('push_enabled')->default(false);
            $table->boolean('email_digest')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');

        Schema::table('followers', function (Blueprint $table): void {
            $table->dropColumn('notifications_muted');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('terms_accepted_at');
        });
    }
};
