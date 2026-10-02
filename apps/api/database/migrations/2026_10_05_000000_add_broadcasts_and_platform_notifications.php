<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Platform-wide broadcasts come from no mosque.
        Schema::table('notifications', function (Blueprint $table): void {
            $table->foreignId('mosque_id')->nullable()->change();
            $table->string('link', 500)->nullable()->after('reference_id');
        });

        Schema::create('broadcasts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('message');
            $table->string('audience', 20);
            $table->string('audience_value', 100)->nullable();
            $table->string('link', 500)->nullable();
            $table->unsignedInteger('recipients_count')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });

        // Approving a claim already verifies the mosque, so this switch did nothing.
        DB::table('system_settings')->where('key', 'auto_publish_verified_mosques')->delete();
    }

    public function down(): void
    {
        Schema::dropIfExists('broadcasts');

        DB::table('notifications')->whereNull('mosque_id')->delete();

        Schema::table('notifications', function (Blueprint $table): void {
            $table->dropColumn('link');
            $table->foreignId('mosque_id')->nullable(false)->change();
        });
    }
};
