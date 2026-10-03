<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Corrections to a mosque's details suggested by the community.
     */
    public function up(): void
    {
        Schema::create('mosque_edit_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mosque_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('field', ['prayer_time', 'jumuah', 'phone', 'address', 'location', 'facilities', 'other']);
            $table->json('payload');
            // The value the mosque had when the suggestion was made, for the before → after view.
            $table->json('before')->nullable();
            $table->text('note')->nullable();
            $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['mosque_id', 'status']);
            $table->index(['status', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('accepted_suggestions_count')->default(0)->after('account_status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('accepted_suggestions_count');
        });

        Schema::dropIfExists('mosque_edit_suggestions');
    }
};
