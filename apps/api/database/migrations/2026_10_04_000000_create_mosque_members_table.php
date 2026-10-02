<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A mosque's team: several admins per mosque, each with a role.
     *
     * A row with a null accepted_at is a pending invitation. An invitation sent
     * to a phone number that has no account yet keeps the phone and a null
     * user_id until that person registers.
     */
    public function up(): void
    {
        Schema::create('mosque_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('phone', 20)->nullable();
            $table->enum('role', ['owner', 'manager', 'editor', 'prayer_times']);
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();

            $table->unique(['mosque_id', 'user_id']);
            $table->unique(['mosque_id', 'phone']);
            $table->index(['user_id', 'accepted_at']);
            $table->index('phone');
        });

        // Every existing mosque owner becomes the owner of its team.
        $now = now();
        DB::table('mosques')
            ->whereNotNull('owner_id')
            ->orderBy('id')
            ->select(['id', 'owner_id'])
            ->chunk(500, function ($mosques) use ($now): void {
                DB::table('mosque_members')->insertOrIgnore($mosques->map(fn ($mosque): array => [
                    'mosque_id' => $mosque->id,
                    'user_id' => $mosque->owner_id,
                    'role' => 'owner',
                    'accepted_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all());
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('mosque_members');
    }
};
