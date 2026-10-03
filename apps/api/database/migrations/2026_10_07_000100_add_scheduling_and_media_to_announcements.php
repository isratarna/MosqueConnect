<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->string('status')->default('draft')->change();
            $table->timestamp('publish_at')->nullable()->index();
            $table->timestamp('expires_at')->nullable()->index();
            $table->boolean('is_pinned')->default(false)->index();
            $table->enum('category', ['general', 'janazah', 'jumuah', 'eid', 'ramadan', 'donation_request', 'event', 'other'])->default('general')->index();
            $table->string('image_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropColumn(['publish_at', 'expires_at', 'is_pinned', 'category', 'image_path']);
            $table->enum('status', ['draft', 'published'])->default('draft')->change();
        });
    }
};
